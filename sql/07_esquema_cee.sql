-- ============================================================
--  ESQUEMA CEE (Centro de Especialización Ejecutiva)
--  Modelo de datos de negocio — aprobado 2026-06-17
--  Ejecutar en: Supabase -> SQL Editor
-- ============================================================

-- ============================================================
--  CATÁLOGOS INDEPENDIENTES (sin FK entrantes)
-- ============================================================

create table if not exists public."Catalogo-Horario-Semanal" (
  tipo_horario      smallint     not null,
  descripcion_horario varchar(127) not null,
  constraint pk_horario_semanal primary key (tipo_horario)
);

create table if not exists public."Catalogo-Maestro-Operador" (
  cod_operador      smallint     not null,
  nombre_operador   varchar(63)  not null,
  correo_electronico varchar(127) not null,
  unique (correo_electronico),
  total_registros   int          not null default 0,
  estado_operador   char(1)      not null default 'A',
  constraint pk_operador primary key (cod_operador)
);

create table if not exists public."Catalogo_Segmento_Curso" (
  segmento_curso  smallint    not null,
  nombre_segmento varchar(63) not null,
  constraint pk_segmento_curso primary key (segmento_curso)
);

create table if not exists public."Catalogo-Transaccion" (
  tipo_transaccion  smallint     not null,
  nombre_transaccion varchar(63) not null,
  descripcion_trx   varchar(127) not null,
  constraint pk_transaccion primary key (tipo_transaccion)
);

create table if not exists public."Catalogo-Tema" (
  cod_tema        int          not null,
  nombre_tema     varchar(63)  not null,
  descripcion_tema varchar(255) not null,
  duracion_tema   smallint     not null,
  constraint pk_tema primary key (cod_tema)
);

-- ============================================================
--  DETALLE-HORARIO (depende de Catalogo-Horario-Semanal)
-- ============================================================

create table if not exists public."Detalle-Horario" (
  tipo_horario smallint not null,
  dia_semana   char(1)  not null,
  hora         smallint not null,
  constraint pk_detalle_horario primary key (tipo_horario, dia_semana, hora),
  constraint fk_dethorario_horario
    foreign key (tipo_horario)
    references public."Catalogo-Horario-Semanal"(tipo_horario)
    on delete cascade
);

-- ============================================================
--  CATALOGO-CURSO (depende de Catalogo_Segmento_Curso)
-- ============================================================

create table if not exists public."Catalogo-Curso" (
  cod_tipo_curso   smallint     not null,
  nombre_curso     varchar(127) not null,
  descripcion_curso varchar(511) not null,
  segmento_curso   smallint     not null,
  constraint pk_curso primary key (cod_tipo_curso),
  constraint fk_curso_segmento
    foreign key (segmento_curso)
    references public."Catalogo_Segmento_Curso"(segmento_curso)
);

-- ============================================================
--  RELACION-PRE-REQUISITO (auto-referencia sobre Catalogo-Curso)
-- ============================================================

create table if not exists public."Relacion-Pre-Requisito" (
  cod_curso        smallint not null,
  cod_curso_previo smallint not null,
  constraint pk_prereq primary key (cod_curso, cod_curso_previo),
  constraint fk_prereq_curso
    foreign key (cod_curso)
    references public."Catalogo-Curso"(cod_tipo_curso),
  constraint fk_prereq_previo
    foreign key (cod_curso_previo)
    references public."Catalogo-Curso"(cod_tipo_curso)
);

-- ============================================================
--  RELACION-SILABUS-X-CURSO (Catalogo-Curso × Catalogo-Tema)
-- ============================================================

create table if not exists public."Relacion-Silabus-X-Curso" (
  cod_tipo_curso smallint not null,
  cod_tema       int      not null,
  secuencia_logica smallint not null,
  constraint pk_silabus primary key (cod_tipo_curso, cod_tema),
  constraint fk_silabus_curso
    foreign key (cod_tipo_curso)
    references public."Catalogo-Curso"(cod_tipo_curso),
  constraint fk_silabus_tema
    foreign key (cod_tema)
    references public."Catalogo-Tema"(cod_tema)
);

-- ============================================================
--  CATALOGO-SERVICIO-CAPACITACION
--  (depende de Catalogo-Curso y Catalogo-Horario-Semanal)
-- ============================================================

create table if not exists public."Catalogo-Servicio-Capacitacion" (
  cod_tipo_servicio      smallint      not null,
  descripcion_servicio   varchar(511)  not null,
  tarifa_curso           numeric(6, 2) not null,
  total_inscripciones    int           not null default 0,
  total_veces_completado int           not null default 0,
  estado_capacitacion    char(1)       not null default 'A',
  tipo_curso             smallint      not null,
  tipo_horario           smallint      not null,
  constraint pk_servicio_cap primary key (cod_tipo_servicio),
  constraint fk_servcap_curso
    foreign key (tipo_curso)
    references public."Catalogo-Curso"(cod_tipo_curso),
  constraint fk_servcap_horario
    foreign key (tipo_horario)
    references public."Catalogo-Horario-Semanal"(tipo_horario)
);

-- ============================================================
--  MAESTRO-CLIENTE-PROSPECTO
-- ============================================================

create table if not exists public."Maestro-Cliente-Prospecto" (
  cod_cliente          int          not null,
  dni_persona          int          not null,
  unique (dni_persona),
  fecha_nacimiento     date         not null,
  nombre_cliente       varchar(63)  not null,
  correo_electronico   varchar(127) not null,
  unique (correo_electronico),
  numero_telefonico    bigint       not null,
  total_cursos_inscritos  smallint  not null default 0,
  total_cursos_terminados smallint  not null default 0,
  total_monto_comprado    int       not null default 0,
  estado_cliente       char(1)      not null default 'A',
  constraint pk_cliente primary key (cod_cliente)
);

-- ============================================================
--  MAESTRO-SERVICIO-ADQUIRIDO
--  (cliente compra un servicio de capacitación)
-- ============================================================

create table if not exists public."Maestro-Servicio-Adquirido" (
  cod_servicio_adquirido int           not null,
  promedio_ponderado     numeric(4, 1),
  estado_servicio        char(1)       not null default 'A',
  cod_tipo_servicio      smallint      not null,
  cod_cliente            int           not null,
  constraint pk_serv_adquirido primary key (cod_servicio_adquirido),
  constraint fk_servadq_servcap
    foreign key (cod_tipo_servicio)
    references public."Catalogo-Servicio-Capacitacion"(cod_tipo_servicio),
  constraint fk_servadq_cliente
    foreign key (cod_cliente)
    references public."Maestro-Cliente-Prospecto"(cod_cliente)
);

-- ============================================================
--  BITACORA-MOVIMIENTOS
-- ============================================================

create table if not exists public."Bitacora-Movimientos" (
  nro_movimiento    int         not null,
  fecha_hora_evento timestamptz not null default now(),
  cod_cliente       int         not null,
  cod_operador      int         not null,
  tipo_transaccion  smallint    not null,
  constraint pk_bitacora primary key (nro_movimiento),
  constraint fk_bit_cliente
    foreign key (cod_cliente)
    references public."Maestro-Cliente-Prospecto"(cod_cliente),
  constraint fk_bit_operador
    foreign key (cod_operador)
    references public."Catalogo-Maestro-Operador"(cod_operador),
  constraint fk_bit_transaccion
    foreign key (tipo_transaccion)
    references public."Catalogo-Transaccion"(tipo_transaccion)
);

-- ============================================================
--  DETALLE-EVENTO-VENTA
--  (líneas de un movimiento de venta)
-- ============================================================

create table if not exists public."Detalle-Evento-Venta" (
  nro_movimiento         int           not null,
  cod_servicio_adquirido smallint      not null,
  detalle_monto          numeric(6, 2) not null,
  constraint pk_detalle_venta primary key (nro_movimiento, cod_servicio_adquirido),
  constraint fk_detventa_bitacora
    foreign key (nro_movimiento)
    references public."Bitacora-Movimientos"(nro_movimiento),
  constraint fk_detventa_servadq
    foreign key (cod_servicio_adquirido)
    references public."Maestro-Servicio-Adquirido"(cod_servicio_adquirido)
);

-- ============================================================
--  DETALLE-LIQUIDACION-SERVICIO
--  (notas/promedio por servicio adquirido dentro de un movimiento)
-- ============================================================

create table if not exists public."Detalle-Liquidacion-Servicio" (
  nro_movimiento         int           not null,
  cod_servicio_adquirido smallint      not null,
  detalle_promedio       numeric(4, 1) not null,
  constraint pk_liquidacion primary key (nro_movimiento, cod_servicio_adquirido),
  constraint fk_liq_bitacora
    foreign key (nro_movimiento)
    references public."Bitacora-Movimientos"(nro_movimiento),
  constraint fk_liq_servadq
    foreign key (cod_servicio_adquirido)
    references public."Maestro-Servicio-Adquirido"(cod_servicio_adquirido)
);

-- ============================================================
--  ÍNDICES DE SOPORTE
-- ============================================================

create index if not exists idx_servadq_cliente
  on public."Maestro-Servicio-Adquirido"(cod_cliente);

create index if not exists idx_servadq_servcap
  on public."Maestro-Servicio-Adquirido"(cod_tipo_servicio);

create index if not exists idx_bitacora_cliente
  on public."Bitacora-Movimientos"(cod_cliente, fecha_hora_evento desc);

create index if not exists idx_bitacora_operador
  on public."Bitacora-Movimientos"(cod_operador);

create index if not exists idx_detventa_movimiento
  on public."Detalle-Evento-Venta"(nro_movimiento);

create index if not exists idx_silabus_curso
  on public."Relacion-Silabus-X-Curso"(cod_tipo_curso);
