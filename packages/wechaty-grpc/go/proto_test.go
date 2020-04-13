package _go

import (
  "github.com/chatie/grpc/go/wechaty"
  "testing"
)

func TestProto(t *testing.T) {
  var _ wechaty.PuppetClient = wechaty.NewPuppetClient(nil)
}
