# Kế hoạch chuyển đổi: Mặc định sqlite_vec và loại bỏ sqlite_json

## Mục tiêu
Loại bỏ hoàn toàn backend `sqlite_json` (quét vector JSON bằng Python in-memory) và chuyển sang `sqlite_vec` (C-extension `vec0`) làm backend vector duy nhất cho toàn bộ hệ thống RAG & Schema Retrieval.

## Chi tiết các bước thực hiện

### 1. Backend: Cấu hình và Hằng số (`apps/api/services/ai/retrieval/vector_store.py`)
- Đổi `SUPPORTED_VECTOR_BACKENDS` thành `("sqlite_vec",)` (loại bỏ `"sqlite_json"`).
- Đổi fallback mặc định trong `resolve_vector_store_config()` thành `"sqlite_vec"`.
- Cập nhật hàm `validate_vector_store_backend` chỉ chấp nhận `sqlite_vec`.

### 2. Backend: Pipeline và Services (`apps/api/services/ai/retrieval/`)
- `pipeline.py`: Cập nhật `capabilities` loại bỏ `"sqlite_json_vectors"`, giữ `"sqlite_vec_acceleration"` (hoặc đổi thành `"sqlite_vec_vectors"`).
- `retrieval_service.py`: Loại bỏ logic fallback duyệt Python `cosine_similarity` qua `rag_embeddings.vectorJson`. Toàn bộ truy vấn ngữ nghĩa chuyển trực tiếp qua `sqlite_vec_store.semantic_scores()`.
- `index_service.py`: Loại bỏ logic điều kiện kiểm tra backend `sqlite_vec` trước khi upsert vào virtual table `vec0`. Mặc định luôn đồng bộ vào `sqlite_vec_store`.
- `ranking.py`: Giữ lại hàm toán học vector nếu cần thiết cho re-ranking, nhưng loại bỏ code quét full table JSON.

### 3. Backend: Schema Retriever (`apps/api/services/schema_retriever.py`)
- Chuyển `schema_retriever` từ in-memory cosine matching qua sử dụng `sqlite_vec_store` hoặc tích hợp cùng virtual table `vec0` của `sqlite-vec`.

### 4. Backend: Unit Tests (`apps/api/tests/test_rag_index.py`)
- Cập nhật các test case đang test `sqlite_json` hoặc fallback sang `sqlite_vec`.
- Thêm/sửa test suite đảm bảo `sqlite_vec` chạy ổn định, mock extension khi chạy CI/in-memory nếu extension C không nạp được.

### 5. Frontend: UI Settings và Tests (`apps/web/`)
- `apps/web/src/app/settings/components/ai-settings/RagIndexingCard.tsx`: Bỏ hiển thị cảnh báo/fallback về `sqlite_json`.
- `apps/web/src/app/settings/components/ai-settings/VectorStoreMap.tsx` & `vector-store-map-graph.ts`: Cập nhật status/graph node label chỉ hỗ trợ `sqlite_vec`.
- `apps/web/tests/components/settings/vector-store-map-graph.test.ts` & `apps/web/tests/services/api-client.test.ts`: Sửa mock API và test assertions tương ứng.

### 6. Documentation
- Cập nhật `README.md`, `CLAUDE.md`, config docs mô tả RAG vector store mặc định là `sqlite_vec`.
