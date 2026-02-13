package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler()
	r.POST("/parse", h.ParseFile)
	r.POST("/diff", h.AnalyzeDiff)
	r.POST("/metrics", h.CalculateMetrics)
	r.GET("/health", h.HealthCheck)
	return r
}

func TestHealthCheck_OK(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))

	var body map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &body)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "go-parser", body["service"])
}

func TestHealthCheck_MethodNotAllowedOrNotFound(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodPost, "/health", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Depending on gin settings, this can be 404 (default) or 405 if HandleMethodNotAllowed is enabled.
	assert.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, w.Code)
}

func TestParseFile_BadRequests(t *testing.T) {
	r := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "invalid json",
			body:       `{"content":"package main", "path":`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing content",
			body:       `{"path":"main.go"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing path",
			body:       `{"content":"package main"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/parse", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
			var resp map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &resp)
			_, hasErr := resp["error"]
			assert.True(t, hasErr, "expected error field in response")
		})
	}
}

func TestParseFile_MethodNotAllowedOrNotFound(t *testing.T) {
	r := setupRouter()

	methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}
	for _, m := range methods {
		t.Run(m, func(t *testing.T) {
			req := httptest.NewRequest(m, "/parse", nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			// Unregistered methods should be 404 by default (or 405 if configured)
			assert.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, w.Code)
		})
	}
}

func TestAnalyzeDiff_BadRequests(t *testing.T) {
	r := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "invalid json",
			body:       `{"old_content": "a", "new_content":`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing old_content",
			body:       `{"new_content":"b"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing new_content",
			body:       `{"old_content":"a"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/diff", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
			var resp map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &resp)
			_, hasErr := resp["error"]
			assert.True(t, hasErr, "expected error field in response")
		})
	}
}

func TestAnalyzeDiff_MethodNotAllowedOrNotFound(t *testing.T) {
	r := setupRouter()

	methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}
	for _, m := range methods {
		t.Run(m, func(t *testing.T) {
			req := httptest.NewRequest(m, "/diff", nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, w.Code)
		})
	}
}

func TestCalculateMetrics_BadRequests(t *testing.T) {
	r := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "invalid json",
			body:       `{"content":`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing content",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/metrics", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
			var resp map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &resp)
			_, hasErr := resp["error"]
			assert.True(t, hasErr, "expected error field in response")
		})
	}
}

func TestCalculateMetrics_MethodNotAllowedOrNotFound(t *testing.T) {
	r := setupRouter()

	methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}
	for _, m := range methods {
		t.Run(m, func(t *testing.T) {
			req := httptest.NewRequest(m, "/metrics", nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, w.Code)
		})
	}
}
