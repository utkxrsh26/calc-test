package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.HandleMethodNotAllowed = true

	h := NewHandler()
	r.POST("/parse", h.ParseFile)
	r.POST("/diff", h.AnalyzeDiff)
	r.POST("/metrics", h.CalculateMetrics)
	r.GET("/healthz", h.HealthCheck)

	return r
}

func TestHealthCheck_OK(t *testing.T) {
	router := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	ct := rr.Header().Get("Content-Type")
	assert.Contains(t, ct, "application/json")

	var body map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.Equal(t, "healthy", body["status"])
	assert.Equal(t, "go-parser", body["service"])
}

func TestParseFile_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantSubstr []string
	}{
		{
			name: "empty body",
			body: ``,
		},
		{
			name:       "missing content",
			body:       `{"path":"main.go"}`,
			wantSubstr: []string{"Content", "required"},
		},
		{
			name:       "missing path",
			body:       `{"content":"package main\nfunc main(){}"}`,
			wantSubstr: []string{"Path", "required"},
		},
		{
			name:       "wrong type for content",
			body:       `{"content":123, "path":"main.go"}`,
			wantSubstr: []string{"json:", "content"},
		},
		{
			name: "invalid json",
			body: `{"content": "x", "path": "p"`, // missing closing brace
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/parse", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
			var resp map[string]any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
			errMsg, ok := resp["error"].(string)
			require.True(t, ok, "expected error string in response")
			assert.NotEmpty(t, errMsg)
			for _, sub := range tc.wantSubstr {
				assert.Contains(t, errMsg, sub)
			}
		})
	}
}

func TestAnalyzeDiff_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantSubstr []string
	}{
		{
			name: "empty body",
			body: ``,
		},
		{
			name:       "missing old_content",
			body:       `{"new_content":"new"}`,
			wantSubstr: []string{"OldContent", "required"},
		},
		{
			name:       "missing new_content",
			body:       `{"old_content":"old"}`,
			wantSubstr: []string{"NewContent", "required"},
		},
		{
			name:       "wrong type for old_content",
			body:       `{"old_content":123, "new_content":"abc"}`,
			wantSubstr: []string{"json:", "old_content"},
		},
		{
			name: "invalid json",
			body: `{"old_content": "a", "new_content": "b"`, // malformed
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/diff", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
			var resp map[string]any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
			errMsg, ok := resp["error"].(string)
			require.True(t, ok)
			assert.NotEmpty(t, errMsg)
			for _, sub := range tc.wantSubstr {
				assert.Contains(t, errMsg, sub)
			}
		})
	}
}

func TestCalculateMetrics_BadRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name       string
		body       string
		wantSubstr []string
	}{
		{
			name: "empty body",
			body: ``,
		},
		{
			name:       "missing content",
			body:       `{}`,
			wantSubstr: []string{"Content", "required"},
		},
		{
			name:       "wrong type for content",
			body:       `{"content":123}`,
			wantSubstr: []string{"json:", "content"},
		},
		{
			name: "invalid json",
			body: `{"content": "abc"`, // malformed
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/metrics", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
			var resp map[string]any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
			errMsg, ok := resp["error"].(string)
			require.True(t, ok)
			assert.NotEmpty(t, errMsg)
			for _, sub := range tc.wantSubstr {
				assert.Contains(t, errMsg, sub)
			}
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	router := setupRouter()

	// GET on a POST-only route should be 405 when HandleMethodNotAllowed is true
	req := httptest.NewRequest(http.MethodGet, "/parse", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}
