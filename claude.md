# CLAUDE.md — Convenciones de diseño backend

Este documento define cómo quiero que escribas código backend cuando trabajemos juntos. Stack: TypeScript/Node, eventualmente Go.

Antes de generar código, leelo entero. Si una decisión que vas a tomar contradice algo de acá, paramos y lo discutimos.

---

## Filosofía general

- **Separación estricta de capas**: HTTP (transporte) → use case (aplicación) → dominio → repos (puertos) → infraestructura. Cada capa habla en su propio lenguaje y depende solo de las que están más adentro.
- **El dominio no sabe de HTTP, ni de la DB, ni del transporte**. Si una decisión depende del cliente o del almacenamiento, vive en el borde, no en el centro.
- **Interfaces hacia el dominio, implementaciones hacia los bordes**. El use case depende de interfaces; las clases concretas las cablea el composition root.
- **Lo simple antes que lo flexible**. No agregues abstracciones por si acaso. Las abstracciones se introducen cuando duele no tenerlas, no cuando teóricamente podrían servir.

---

## Estructura de carpetas

```
src/
├── server.ts                          ← entrypoint HTTP
├── composition-root.ts                ← único lugar que conoce implementaciones concretas
└── <feature>/                         ← ej: bookings, users, payments
    ├── controllers/
    │   ├── <feature>Controller.ts     ← factory que recibe el use case
    │   ├── <feature>DtoMapper.ts      ← entity → DTO de salida
    │   └── errorMapper.ts             ← DomainError → HTTP response
    ├── entities/
    │   └── <Entity>.ts                ← clase con factory `create`, invariantes adentro
    ├── errors.ts                      ← clases de error custom del dominio
    ├── notifiers/                     ← servicios de dominio (no técnicos)
    │   ├── <Entity>Notifier.ts        ← interface
    │   └── implementation/
    ├── repositories/
    │   ├── <Entity>Repository.ts      ← interface
    │   └── implementation/
    │       └── memory/                ← para tests / desarrollo local
    │       └── pg/                    ← producción
    ├── schema/
    │   └── <action>Input.ts           ← validación de shape (Zod)
    └── use-cases/
        └── <Action><Entity>.use-case.ts
```

---

## Reglas de diseño

### 1. Repositories operan sobre su entidad

- Si un método devuelve `Booking`, vive en `BookingRepository`, no en `RoomRepository`.
- El nombre del repo te dice qué entidad maneja; los métodos tienen que ser coherentes.

### 2. Los métodos del repo expresan preguntas del dominio

```typescript
// ❌ Repo como wrapper de SQL
findByRange(roomId, startsAt, endsAt): Promise<Booking[]>

// ✅ Repo como pregunta del dominio
hasOverlap(roomId, startsAt, endsAt): Promise<boolean>
findOverlapping(roomId, startsAt, endsAt): Promise<Booking | null>
```

- Si el caller solo necesita saber sí/no → boolean.
- Si necesita datos del conflicto → la entidad o `null`.
- Si necesita contar → number.
- **Nunca devolver una lista para que el caller la cuente o filtre.**

### 3. El repo dice hechos, el use case toma decisiones

```typescript
// ❌ Regla de negocio en la firma del repo
hasReachedLimit(userId: string, limit: number): Promise<boolean>

// ✅ El repo cuenta, el use case interpreta
countFutureByUser(userId: string): Promise<number>
// y en el use case:
if (count >= 3) throw new UserBookingLimitError();
```

### 4. Las invariantes del dominio viven en la entidad

- Validaciones de "qué hace válida a esta entidad" → en el factory `create`.
- Validaciones de transporte (formato, tipo) → en el schema (Zod).
- **Las invariantes no van sueltas en el use case** (se duplican entre casos de uso).

```typescript
export class Booking {
  private constructor(/* campos readonly */) {}

  static create(props: BookingProps, now: Date): Booking {
    if (props.endsAt <= props.startsAt) throw new InvalidBookingRangeError();
    if (props.startsAt < now) throw new PastBookingRangeError();
    return new Booking(randomUUID(), ..., now);
  }
}
```

### 5. Efectos del mundo son inputs, no asumpciones

- `now: Date` se pasa como parámetro; no `new Date()` adentro de funciones de dominio.
- El use case toma la hora del sistema una vez, en el borde, y la pasa hacia adentro.
- Mismo principio para random, IDs, environment.

### 6. El dominio genera su propia identidad

- `id` (UUID) y `createdAt` los genera la entidad en el factory `create`.
- La entidad nace con identidad; no espera a que el repo se la asigne.
- No usar auto-increment de la DB para datos del dominio.

### 7. Orden de validaciones

1. **Barato antes que caro**: validaciones en memoria antes que IO.
2. **Fundamental antes que contextual**: ¿el recurso existe? antes de ¿el usuario tiene cuota?
3. **No accionable antes que accionable**: si el usuario no puede arreglarlo, decírselo primero.

### 8. Errores son clases tipadas, no strings

```typescript
// ❌ Stringly-typed
throw new Error("overlap");
// y en el caller:
switch (err.message) { case "overlap": ... }

// ✅ Clases tipadas con datos estructurados
export class OverlapError extends Error {
  readonly code = "overlap" as const;
  constructor(public readonly conflictingBookingId: string) {
    super(`Overlaps with booking ${conflictingBookingId}`);
    this.name = "OverlapError";
  }
}
throw new OverlapError(existing.id);
```

- Separar `message` (para humanos / logs) de `code` (para máquinas / API).
- Los errores son del dominio; los protocolos los traducen.

### 9. El controller traduce dominio → transporte

- `mapDomainErrorToHttp(err)`: tabla declarativa de mapeo.
- `entityToDto(entity)`: serialización a JSON.
- El use case no sabe de HTTP, status codes, headers, ni formato de fechas.

### 10. Use case devuelve entidades, controller devuelve DTOs

```typescript
// use case
async execute(dto: Input): Promise<Booking>

// controller
const booking = await useCase.execute(input);
return { status: 201, body: bookingToDto(booking) };
```

### 11. Composition root: único lugar que conoce concreto

- Todos los `new ConcreteClass(...)` viven en `composition-root.ts`.
- Una instancia por dependencia, compartida entre todos los consumidores.
- Use cases y controllers son factories que reciben sus dependencias por constructor.

```typescript
// composition-root.ts
const bookingRepo = new PgBookingRepository(pool);
const roomRepo = new PgRoomRepository(pool);
const emailService = new SendGridEmailService(apiKey);
const bookingNotifier = new EmailBookingNotifier(emailService);

const createBookingUseCase = new CreateBookingUseCase(roomRepo, bookingRepo, bookingNotifier);

export const handleCreateBooking = createBookingController(createBookingUseCase);
```

### 12. Servicios técnicos vs servicios de dominio

- **Servicio técnico** (`EmailService`): habla en lenguaje de infra, genérico, reutilizable.
- **Servicio de dominio** (`BookingNotifier`): habla en lenguaje del dominio, específico.
- El use case depende del servicio de dominio. El servicio de dominio usa el técnico adentro.

### 13. Side effects no críticos: fire-and-forget

- El éxito de la operación principal no debe depender del éxito de notificaciones.

```typescript
await bookingRepo.save(booking);

bookingNotifier.notifyBookingCreated(booking).catch(err => {
  logger.error("notification_failed", { bookingId: booking.id, err });
});

return booking;
```

- Si se necesita **garantía de entrega real**, usar outbox pattern (ver sección de transacciones).

---

## Transactions

### Cuándo

Cuando el use case modifica más de una entidad y todas tienen que pasar juntas o ninguna.

### Quién

El use case. Es el único que ve la operación completa.

### Cómo

Patrón **Unit of Work** con tx explícita:

```typescript
interface UnitOfWork {
  run<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}

// uso
await this.unitOfWork.run(async (tx) => {
  await this.bookingRepository.save(booking, tx);
  await this.userRepository.decrementCredits(userId, 1, tx);
});
```

### Reglas

- **Escrituras**: tx obligatoria en la firma del repo (TypeScript te cubre).
- **Lecturas**: sin tx, usan el pool directo.
- **Side effects al mundo externo** (mails, llamadas a APIs, eventos a colas): **siempre afuera de la tx**.
- Una tx en curso mantiene una conexión ocupada → no hacer cómputo pesado ni IO externo adentro.

### Outbox pattern

Cuando necesitás garantía de que un side effect ocurra incluso si el proceso muere:

```typescript
await unitOfWork.run(async (tx) => {
  await bookingRepository.save(booking, tx);
  await outbox.add("BookingCreated", { bookingId: booking.id }, tx);
});
// worker separado lee la tabla outbox y procesa
```

---

## Concurrencia

### Race conditions típicas

`SELECT` + `INSERT` en el use case no son atómicos. Entre uno y otro puede pasar otra transacción.

### Soluciones, en orden de preferencia

1. **Constraints en la DB** para reglas estructurales (unicidad, exclusion para overlap, foreign keys). La base hace el trabajo.

   ```sql
   ALTER TABLE bookings ADD CONSTRAINT no_overlap
     EXCLUDE USING gist (room_id WITH =, tsrange(starts_at, ends_at) WITH &&);
   ```

   En el use case, atrapar el error de constraint y traducirlo a `OverlapError`.

2. **Pessimistic locking** (`SELECT ... FOR UPDATE`) cuando hay un recurso compartido con conflictos frecuentes.

   ```typescript
   const room = await roomRepo.findByIdForUpdate(roomId, tx);
   // operaciones que dependen de room
   ```

3. **Optimistic con re-check** cuando no hay constraint posible y los conflictos son raros: insertar, después verificar adentro de la misma transacción.

### Criterio

- Conflictos raros + constraint expresable → constraint.
- Conflictos frecuentes sobre recurso compartido → FOR UPDATE.
- Sin constraint posible → optimistic con re-check + isolation `SERIALIZABLE` o `REPEATABLE READ`.

---

## Idempotencia

- Solo para operaciones de escritura (POST, PUT, DELETE).
- Cliente manda header `Idempotency-Key`.
- Implementación en **middleware**, no en el controller individual.

```typescript
const cached = await idempotencyRepo.findByKey(key);
if (cached) return cached.response;

const response = await next();

await idempotencyRepo.save(key, response); // misma tx que el cambio principal
return response;
```

- Tabla `idempotency_keys` en la misma DB (no Redis: dual write).
- `key` como PRIMARY KEY → si dos requests con el mismo key entran a la vez, uno falla con constraint violation y reintenta leyendo el cached.
- TTL de 24-48hs, cleanup por job programado.

---

## Authentication / Authorization

### Authentication

- Middleware antes del controller.
- Valida el token, extrae `userId` y roles, los pone en el request.
- **El `userId` nunca viene en el body**. Viene del token autenticado.

### Authorization

- **Estructural** ("este endpoint requiere rol X"): middleware o decorator en la capa HTTP.
- **De dominio** ("solo podés cancelar tus propias reservas"): en el use case o la entidad.

```typescript
// use case
async cancelBooking(bookingId: string, requestingUserId: string): Promise<void> {
  const booking = await repo.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.userId !== requestingUserId) throw new ForbiddenError();
  // ...
}
```

---

## Observabilidad

### Logs

- Estructurados (JSON), no strings concatenados.
- Eventos significativos del dominio, no rastros de ejecución.

```typescript
logger.info("booking_created", {
  bookingId: booking.id,
  userId: booking.userId,
  durationMs: 47,
});
```

- Logger se inyecta como dependencia (interface en el dominio, implementación en infra).

### Traces

- OpenTelemetry. Cada operación significativa es un span.
- Spans anidados forman el árbol del request.

### Metrics

- En el adaptador HTTP, no en el use case.
- Status codes, latencia, throughput por endpoint.
- Alertas sobre tasa de error y p95 de latencia.

---

## Antipatrones a evitar siempre

- ❌ Métodos sobre la entidad X en el repo de la entidad Y.
- ❌ `findByRange().length > 0` cuando alcanza con un boolean.
- ❌ Reglas de negocio (límites, umbrales) en las firmas de los repos.
- ❌ `throw new Error("string_code")` con switch sobre `err.message`.
- ❌ Validaciones del dominio sueltas en el use case (deberían vivir en la entidad).
- ❌ `new Date()` dentro de funciones del dominio.
- ❌ Repos o servicios instanciados fuera del composition root.
- ❌ Templates, copy o formatos específicos del adaptador dentro del use case.
- ❌ `await emailService.send(...)` bloqueante cuando el éxito del request no debería depender del mail.
- ❌ Side effects al mundo externo dentro de transacciones de DB.
- ❌ Cachear idempotency keys en un sistema separado de la DB principal.
- ❌ `userId` viniendo del body en endpoints autenticados.
- ❌ Servicios técnicos genéricos (`EmailService`) inyectados directamente en use cases cuando el caso ya tiene un servicio de dominio que lo envuelve.

---

## Flujo cuando me pidas implementar una feature

1. Discutir las reglas del dominio antes de tocar código.
2. Modelar la entidad y sus invariantes.
3. Definir las interfaces de los repos (preguntas del dominio, no SQL).
4. Definir errores tipados.
5. Implementar el use case con dependencias inyectadas por constructor.
6. Implementar el controller (parse → ejecutar → mapear).
7. Cablear todo en el composition root.
8. Implementaciones concretas de repos (memoria primero para testear, después la real).

Si en algún paso una decisión no está clara, paramos y la discutimos en lugar de elegir por defecto.
