package _go

import (
	"testing"

	"github.com/chatie/grpc/go/wechaty"
)

func TestProto(t *testing.T) {
	var _ wechaty.PuppetClient = wechaty.NewPuppetClient(nil)
}
