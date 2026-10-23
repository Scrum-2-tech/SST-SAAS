# 🏗️ Arquitectura del Sistema — SST SaaS

Documento visual de cómo encajan las piezas. Útil para explicar el proyecto en la presentación.

---

## Vista general (componentes y flujo)

```mermaid
flowchart LR
    subgraph Cliente["🌐 Navegador (http://localhost:4200)"]
        FE["Frontend<br/>React + Vite + Tailwind"]
    end

    subgraph Servidor["⚙️ Backend (http://localhost:8000)"]
        API["FastAPI<br/>Routers + Dependencias"]
        AUTH["Seguridad<br/>JWT + bcrypt"]
        TEN["Multi-tenant<br/>X-Company-Id"]
    end

    subgraph Datos["🗄️ Persistencia"]
        DB[("PostgreSQL<br/>en Docker :5432")]
        FS["Almacenamiento<br/>archivos en disco<br/>backend/storage/"]
    end

    FE -- "HTTP + JWT (Bearer)<br/>+ header X-Company-Id" --> API
    API --> AUTH
    API --> TEN
    API -- "SQLAlchemy" --> DB
    API -- "subida/descarga<br/>por chunks" --> FS
```

---

## Modelo de datos (entidades y relaciones)

```mermaid
erDiagram
    USERS ||--o{ COMPANIES : "es dueño (owner_id)"
    COMPANIES ||--o{ FOLDERS : contiene
    COMPANIES ||--o{ FILES : contiene
    COMPANIES ||--o{ AUDIT_LOGS : registra
    COMPANIES ||--o{ SST_AUDITS : tiene
    FOLDERS ||--o{ FOLDERS : "subcarpetas (parent_id)"
    FOLDERS ||--o{ FILES : almacena
    SST_AUDITS ||--o{ SST_FINDINGS : contiene
    USERS ||--o{ AUDIT_LOGS : genera

    USERS {
        uuid id PK
        string email
        string password_hash
        enum role
        uuid company_id FK
    }
    COMPANIES {
        uuid id PK
        string name
        string nit
        uuid owner_id FK
    }
    FOLDERS {
        uuid id PK
        string name
        uuid parent_id FK
        uuid company_id FK
    }
    FILES {
        uuid id PK
        string name
        string file_url
        bool is_critical
        date expiration_date
        uuid folder_id FK
        uuid company_id FK
    }
    AUDIT_LOGS {
        uuid id PK
        string action
        string ip_address
        datetime timestamp
    }
    SST_AUDITS {
        uuid id PK
        string title
        string auditor
        enum status
        uuid company_id FK
    }
    SST_FINDINGS {
        uuid id PK
        text description
        enum finding_type
        enum status
        uuid audit_id FK
    }
```

---

## Flujo de autenticación y multi-tenant

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant DB as PostgreSQL

    U->>FE: Ingresa correo + contraseña
    FE->>BE: POST /auth/login (form-data)
    BE->>DB: Busca usuario y verifica hash (bcrypt)
    DB-->>BE: Usuario válido
    BE-->>FE: Devuelve token JWT
    FE->>BE: GET /auth/me (Bearer token)
    BE-->>FE: Datos del usuario + ROL
    Note over FE: Guarda token y oculta/muestra<br/>menús según el rol

    U->>FE: Selecciona empresa activa
    FE->>BE: GET /files (Bearer + X-Company-Id)
    BE->>BE: Valida que la empresa<br/>pertenezca al usuario
    BE->>DB: Consulta filtrada por company_id
    DB-->>BE: Solo datos de esa empresa
    BE-->>FE: Lista de archivos (aislada por tenant)
```

---

## Estados de un documento (control de vencimiento)

```mermaid
stateDiagram-v2
    [*] --> SinVencimiento: sin fecha
    [*] --> Vigente: con fecha futura
    Vigente --> PorVencer: faltan <= 30 días
    PorVencer --> Vencido: pasó la fecha
    Vigente --> Vencido: pasó la fecha
    SinVencimiento --> SinVencimiento: no caduca

    note right of Vigente: Badge verde
    note right of PorVencer: Badge ámbar
    note right of Vencido: Badge rojo
```
