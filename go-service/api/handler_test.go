package api

import (
	"bytes"
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
	assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))

	var body map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &body)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "go-parser", body["service"])
}

func TestParseFile_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/parse", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	_, ok := body["error"]
	assert.True(t, ok, "expected error field in response")
}

func TestParseFile_MissingFields(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name       string
		payload    string
		wantStatus int
	}{
		{
			name:       "missing content",
			payload:    `{"path":"file.go"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing path",
			payload:    `{"content":"package main"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty fields",
			payload:    `{"content":"","path":""}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/parse", bytes.NewBufferString(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			_, ok := body["error"]
			assert.True(t, ok, "expected error field in response")
		})
	}
}

func TestParseFile_MethodNotAllowed(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/parse", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Gin returns 404 for unmatched method by default
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAnalyzeDiff_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/diff", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	_, ok := body["error"]
	assert.True(t, ok)
}

func TestAnalyzeDiff_MissingFields(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name       string
		payload    string
		wantStatus int
	}{
		{
			name:       "missing old_content",
			payload:    `{"new_content":"new"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing new_content",
			payload:    `{"old_content":"old"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty fields",
			payload:    `{"old_content":"","new_content":""}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/diff", bytes.NewBufferString(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			_, ok := body["error"]
			assert.True(t, ok)
		})
	}
}

func TestAnalyzeDiff_MethodNotAllowed(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/diff", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCalculateMetrics_BadJSON(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/metrics", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var body map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	_, ok := body["error"]
	assert.True(t, ok)
}

func TestCalculateMetrics_MissingFields(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	tests := []struct {
		name       string
		payload    string
		wantStatus int
	}{
		{
			name:       "missing content",
			payload:    `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty content",
			payload:    `{"content":""}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/metrics", bytes.NewBufferString(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			var body map[string]any
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			_, ok := body["error"]
			assert.True(t, ok)
		})
	}
}

func TestCalculateMetrics_MethodNotAllowed(t *testing.T) {
	h := NewHandler()
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
