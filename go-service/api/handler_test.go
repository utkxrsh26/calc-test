package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"polyglot-codebase/go-service/internal/parser"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// mockParser is a testify mock for parser.Parser
type mockParser struct {
	mock.Mock
}
