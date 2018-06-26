import * as grpc from 'grpc'
import * as path from 'path'

const PROTO_FILE = path.resolve(__dirname, '../proto/books.proto')

const booksProto = grpc.load(PROTO_FILE)

const client = new booksProto.books.BookService('127.0.0.1:50051',
  grpc.credentials.createInsecure())

function printResponse(error: Error, response: Object) {
  if (error)
    console.log('Error: ', error)
  else
    console.log(response)
}

function listBooks() {
  client.list({}, function(error: Error, books: Object[]) {
    printResponse(error, books)
  })
}

function insertBook(id: string, title: string, author: string) {
  const book = { id: parseInt(id), title: title, author: author }
  client.insert(book, function(error: Error, empty: {}) {
    printResponse(error, empty)
  })
}

function getBook(id: string) {
  client.get({ id: parseInt(id) }, function(error: Error, book: Object) {
    printResponse(error, book)
  })
}

function deleteBook(id: string) {
  client.delete({ id: parseInt(id) }, function(error: Error, empty: {}) {
    printResponse(error, empty)
  })
}

// add the following section
function watchBooks() {
  const call = client.watch({})
  call.on('data', function(book: Object) {
    console.log(book)
  })
}

// add the following section
const processName = process.argv.shift()
const scriptName = process.argv.shift()
const command = process.argv.shift()

console.log(processName, scriptName, command)

if (command === 'list')
  listBooks()
else if (command === 'insert')
  insertBook(process.argv[0], process.argv[1], process.argv[2])
else if (command === 'get')
  getBook(process.argv[0])
else if (command === 'delete')
  deleteBook(process.argv[0])
else if (command === 'watch')
  watchBooks()
else
  console.log('ah?')
