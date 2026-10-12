# Bài 5: Tự động hóa điều phối đa dịch vụ với Docker Compose & File .env



## 2. Cấu trúc thư mục
Đường dẫn nộp bài trên GitHub: `homework/session_10/ex5/`

```text
homework/session_10/ex5/
├── .env                  # Tệp chứa biến môi trường thực tế (Bị ignore)
├── .env.example          # Tệp mẫu hướng dẫn cấu hình biến môi trường
├── .gitignore            # Bỏ qua tệp .env và node_modules khi push Git
├── docker-compose.yml    # Tệp khai báo điều phối đa container (IaC)
├── Dockerfile            # Dockerfile build image cho backend service
├── package.json          # Dependencies (Express & PostgreSQL client)
├── server.js             # Mã nguồn Backend API kết nối CSDL PostgreSQL
└── README.md             # Tài liệu hướng dẫn và báo cáo kết quả
```

---

## 3. Chi tiết cấu hình các tệp tin

### 3.1. Tệp `docker-compose.yml`
```yaml
services:
  database:
    image: postgres:15-alpine
    container_name: db-server
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend-net
    restart: unless-stopped

  backend:
    build: .
    container_name: backend-app
    ports:
      - "${PORT}:8080"
    environment:
      PORT: 8080
      DB_HOST: database
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - database
    networks:
      - backend-net
    restart: unless-stopped

volumes:
  pgdata:

networks:
  backend-net:
```

### 3.2. Quản lý biến môi trường (`.env`, `.env.example`, `.gitignore`)

#### Tệp `.env` (Chứa giá trị thực tế tại môi trường chạy):
```env
# Application Port (Host Port)
PORT=8085

# PostgreSQL Configuration
DB_NAME=app_db
DB_USER=postgres
DB_PASSWORD=secretpassword123
```

#### Tệp `.env.example` (Mẫu khai báo để chia sẻ an toàn):
```env
# Application Port (Host Port)
PORT=8085

# PostgreSQL Configuration
DB_NAME=app_db
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
```

#### Tệp `.gitignore`:
```gitignore
# Environment variables (Bảo mật thông tin nhạy cảm)
.env

# Dependencies
node_modules/
npm-debug.log*

# OS and Editor files
.DS_Store
Thumbs.db
```

---

## 4. Giải thích các thành phần kỹ thuật quan trọng

1. **`depends_on`**:
   - Khai báo rằng dịch vụ `backend` phụ thuộc vào `database`.
   - Docker Compose sẽ đảm bảo container `database` được khởi tạo và chạy trước container `backend`.

2. **Root-level `networks` (`backend-net`)**:
   - Tạo mạng bridge riêng cho toàn bộ cụm dịch vụ.
   - Nhờ Docker Embedded DNS, container `backend` dễ dàng kết nối tới PostgreSQL chỉ bằng hostname service `database` thay vì phải chỉ định địa chỉ IP tĩnh.

3. **Root-level `volumes` (`pgdata`)**:
   - Khai báo Named Volume dùng chung được quản lý bởi Docker Engine.
   - Dữ liệu của PostgreSQL trong `/var/lib/postgresql/data` được lưu trữ an toàn ngoài vòng đời của container, không bị mất khi chạy lệnh `docker compose down`.

4. **Biến môi trường nội suy (`${VAR}`)**:
   - Docker Compose tự động đọc các giá trị trong tệp `.env` cùng thư mục để thay thế vào chuỗi `${...}` trong file compose mà không cần hardcode thông tin nhạy cảm.

---

## 5. Hướng dẫn vận hành với Docker Compose CLI v2

### Bước 1: Khởi động toàn bộ cụm dịch vụ
```bash
docker compose up -d
```
> Docker Compose sẽ tự động:
> 1. Đọc tệp `.env`
> 2. Khởi tạo network `ex5_backend-net`
> 3. Khởi tạo volume `ex5_pgdata`
> 4. Build image cho service `backend`
> 5. Khởi chạy 2 container `db-server` và `backend-app` theo đúng thứ tự phụ thuộc.

### Bước 2: Kiểm tra trạng thái các container
```bash
docker compose ps
```
**Kết quả hiển thị:**
```text
NAME          IMAGE                COMMAND                  SERVICE    CREATED         STATUS         PORTS
backend-app   ex5-backend          "docker-entrypoint.s…"   backend    Up 3 seconds    0.0.0.0:8085->8080/tcp
db-server     postgres:15-alpine   "docker-entrypoint.s…"   database   Up 4 seconds    5432/tcp
```

### Bước 3: Xem nhật ký hoạt động (Logs)
```bash
# Xem log tổng hợp của tất cả dịch vụ
docker compose logs

# Hoặc theo dõi log theo thời gian thực
docker compose logs -f
```

### Bước 4: Kiểm tra kết nối API và truy vấn CSDL
```bash
# 1. Kiểm tra trạng thái Backend API
curl http://localhost:8085/
# Output: {"message":"Welcome to Homework Session 10 - Exercise 5 Docker Compose Multi-Service Architecture","service":"Backend API","orchestration":"Docker Compose v2"}

# 2. Kiểm tra Health check
curl http://localhost:8085/api/health
# Output: {"status":"UP","uptime":14.0}

# 3. Kiểm tra Backend giao tiếp và truy vấn thành công tới PostgreSQL
curl http://localhost:8085/api/db-check
# Output:
# {
#   "success": true,
#   "message": "Successfully connected to PostgreSQL via Docker Compose internal network",
#   "database": "app_db",
#   "host": "database",
#   "currentTime": "2026-10-12T16:44:07.620Z",
#   "postgresVersion": "PostgreSQL 15.19 on x86_64-pc-linux-musl..."
# }
```

### Bước 5: Dừng và thu hồi tài nguyên
```bash
# Dừng và xóa container, network (vẫn giữ nguyên volume dữ liệu pgdata)
docker compose down

# Trong trường hợp muốn xóa cả volume dữ liệu:
# docker compose down -v
```

---

## 6. Kết luận
- Việc chuẩn hóa kiến trúc với **Docker Compose v2** kết hợp **Tệp .env** giúp quản lý cụm dịch vụ một cách nhất quán, dễ mở rộng và tuân thủ các nguyên tắc bảo mật trong DevOps.
- Dịch vụ sẵn sàng triển khai trên mọi môi trường (Development, Staging, Production) chỉ với một lệnh duy nhất: `docker compose up -d`.
