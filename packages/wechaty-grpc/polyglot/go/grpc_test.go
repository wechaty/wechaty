package _go

import (
	"testing"

	"github.com/wechaty/go-grpc/wechaty"
)

func TestProto(t *testing.T) {
	var _ wechaty.PuppetClient = wechaty.NewPuppetClient(nil)
}
