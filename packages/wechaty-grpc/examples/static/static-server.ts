import { EventEmitter } from 'events'
import * as grpc from 'grpc'
import * as path from 'path'

const PROTO_FILE = path.resolve(__dirname, 'books.proto')

req.setUsername('johndoe')
client.getUser(req, (err, user) => { /* ... */ })

const bookStream = new EventEmitter()
const booksProto = grpc.load(PROTO_FILE)

// In-memory array of book objects
const books = [
  { id: 123, title: 'A Tale of Two Cities', author: 'Charles Dickens' },
]

const server = new grpc.Server()
server.addService(booksProto.books.BookService.service, {
    list: function(call: grpc.Call, callback: grpc.requestCallback<Object>) {
        callback(null, books)
    },
    // add the insert method
    insert: function(call: grpc.ServerUnaryCall<any>, callback: grpc.requestCallback<Object>) {
        const book = call.request
        books.push(book)
        bookStream.emit('new_book', book)
        callback(null, {})
    },
    // add the following get method
    get: function(call: grpc.ServerUnaryCall<any>, callback: grpc.requestCallback<Object>) {
        for (let i = 0; i < books.length; i++)
            if (books[i].id === call.request.id)
                return callback(null, books[i])
        callback({
            code: grpc.status.NOT_FOUND,
            message: 'Not found',
            name: 'name',
        }, undefined)
    },
    // add the following delete method
    delete: function(call: grpc.ServerUnaryCall<any>, callback: grpc.requestCallback<Object>) {
        for (let i = 0; i < books.length; i++) {
            if (books[i].id === call.request.id) {
                books.splice(i, 1)
                return callback(null, {})
            }
        }
        callback({
            code: grpc.status.NOT_FOUND,
            message: 'Not found',
            name: 'name',
        }, undefined)
    },
    watch: function(stream: grpc.ClientWritableStream<Object>) {
        bookStream.on('new_book', function(book) {
            stream.write(book)
        })
    },
})

server.bind('0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure())
console.log('Server running at http://0.0.0.0:50051')
server.start()
