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
	router := setupRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))

	var got map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &got)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", got["status"])
	assert.Equal(t, "go-parser", got["service"])
}

func TestParseFile_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name string
		body string
	}{
		{name: "empty body", body: ""},
		{name: "missing content", body: `{"path":"main.go"}`},
		{name: "missing path", body: `{"content":"package main"}`},
		{name: "invalid json", body: "{"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			var r *http.Request
			if tt.body == "" {
				r = httptest.NewRequest(http.MethodPost, "/parse", nil)
			} else {
				r = httptest.NewRequest(http.MethodPost, "/parse", strings.NewReader(tt.body))
			}
			r.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, r)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var got map[string]any
			err := json.Unmarshal(w.Body.Bytes(), &got)
			assert.NoError(t, err)
			assert.Contains(t, got, "error")
			assert.NotEmpty(t, got["error"])
		})
	}
}

func TestAnalyzeDiff_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name string
		body string
	}{
		{name: "empty body", body: ""},
		{name: "missing new_content", body: `{"old_content":"old"}`},
		{name: "missing old_content", body: `{"new_content":"new"}`},
		{name: "missing both", body: `{}`},
		{name: "invalid json", body: "{"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			var r *http.Request
			if tt.body == "" {
				r = httptest.NewRequest(http.MethodPost, "/diff", nil)
			} else {
				r = httptest.NewRequest(http.MethodPost, "/diff", strings.NewReader(tt.body))
			}
			r.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, r)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var got map[string]any
			err := json.Unmarshal(w.Body.Bytes(), &got)
			assert.NoError(t, err)
			assert.Contains(t, got, "error")
			assert.NotEmpty(t, got["error"])
		})
	}
}

func TestCalculateMetrics_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name string
		body string
	}{
		{name: "empty body", body: ""},
		{name: "missing content", body: `{}`},
		{name: "empty content string", body: `{"content":""}`},
		{name: "invalid json", body: "{"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			var r *http.Request
			if tt.body == "" {
				r = httptest.NewRequest(http.MethodPost, "/metrics", nil)
			} else {
				r = httptest.NewRequest(http.MethodPost, "/metrics", strings.NewReader(tt.body))
			}
			r.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, r)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			var got map[string]any
			err := json.Unmarshal(w.Body.Bytes(), &got)
			assert.NoError(t, err)
			assert.Contains(t, got, "error")
			assert.NotEmpty(t, got["error"])
		})
	}
}
