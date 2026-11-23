/**
 * `StringValue` and `Timestamp`: subclasses of the google-protobuf well-known
 * wrappers, re-exported so consumers do not import google-protobuf directly.
 */
import timestamp from 'google-protobuf/google/protobuf/timestamp_pb.js'
import wrappers  from 'google-protobuf/google/protobuf/wrappers_pb.js'

class StringValue extends wrappers.StringValue  {}
class Timestamp   extends timestamp.Timestamp   {}

export {
  StringValue,
  Timestamp,
}
