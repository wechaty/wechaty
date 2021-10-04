import timestamp from 'google-protobuf/google/protobuf/timestamp_pb.js'
import wrappers  from 'google-protobuf/google/protobuf/wrappers_pb.js'

class StringValue extends wrappers.StringValue  {}
class Timestamp   extends timestamp.Timestamp   {}

export {
  StringValue,
  Timestamp,
}
