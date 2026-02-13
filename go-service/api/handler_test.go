package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter(h *Handler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/parse", h.ParseFile)
	r.POST("/diff", h.AnalyzeDiff)
	r.POST("/metrics", h.CalculateMetrics)
	r.GET("/health", h.HealthCheck)
	return r
}

func TestHealthCheck_OK(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "go-parser", body["service"])
}

func TestParseFile_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/parse", strings.NewReader(`{"content": "x",`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Contains(t, body["error"], "invalid character")
}

func TestParseFile_ValidationErrors(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name       string
		payload    string
		wantFields []string
	}{
		{
			name:       "missing content",
			payload:    `{"path":"main.go"}`,
			wantFields: []string{"Content"},
		},
		{
			name:       "missing path",
			payload:    `{"content":"package main\nfunc main(){}"}`,
			wantFields: []string{"Path"},
		},
		{
			name:       "empty fields",
			payload:    `{"content":"","path":""}`,
			wantFields: []string{"Content", "Path"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/parse", strings.NewReader(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			errStr, _ := body["error"].(string)
			for _, f := range tt.wantFields {
				assert.Contains(t, errStr, f)
				assert.Contains(t, errStr, "required")
			}
		})
	}
}

func TestParseFile_Success(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	// Provide a simple Go file content; even if parser behavior varies, we only assert 200 and JSON.
	payload := `{"content":"package main\nfunc main(){}","path":"main.go"}`
	req := httptest.NewRequest(http.MethodPost, "/parse", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	// Ensure body is valid JSON
	var body any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
}

func TestAnalyzeDiff_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/diff", strings.NewReader(`{"old_content": "a",`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Contains(t, body["error"], "invalid character")
}

func TestAnalyzeDiff_ValidationErrors(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name       string
		payload    string
		wantFields []string
	}{
		{
			name:       "missing old_content",
			payload:    `{"new_content":"b"}`,
			wantFields: []string{"OldContent"},
		},
		{
			name:       "missing new_content",
			payload:    `{"old_content":"a"}`,
			wantFields: []string{"NewContent"},
		},
		{
			name:       "empty both",
			payload:    `{"old_content":"","new_content":""}`,
			wantFields: []string{"OldContent", "NewContent"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/diff", strings.NewReader(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			errStr, _ := body["error"].(string)
			for _, f := range tt.wantFields {
				assert.Contains(t, errStr, f)
				assert.Contains(t, errStr, "required")
			}
		})
	}
}

func TestAnalyzeDiff_Success(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	payload := `{"old_content":"a\n","new_content":"a\nb\n"}`
	req := httptest.NewRequest(http.MethodPost, "/diff", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	var body any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
}

func TestCalculateMetrics_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/metrics", strings.NewReader(`{"content":`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Contains(t, body["error"], "invalid character")
}

func TestCalculateMetrics_ValidationErrors(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name    string
		payload string
	}{
		{
			name:    "missing content",
			payload: `{}`,
		},
		{
			name:    "empty content",
			payload: `{"content":""}`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/metrics", strings.NewReader(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			errStr, _ := body["error"].(string)
			assert.Contains(t, errStr, "Content")
			assert.Contains(t, errStr, "required")
		})
	}
}

func TestCalculateMetrics_Success(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	payload := `{"content":"package main\nfunc main(){}"}`
	req := httptest.NewRequest(http.MethodPost, "/metrics", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	var body any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
}

func TestRoutes_MethodVariations(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	// GET on POST-only route should be 404
	req := httptest.NewRequest(http.MethodGet, "/parse", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// DELETE on POST-only route should be 404
	req = httptest.NewRequest(http.MethodDelete, "/diff", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	// PUT on POST-only route should be 404
	req = httptest.NewRequest(http.MethodPut, "/metrics", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}
