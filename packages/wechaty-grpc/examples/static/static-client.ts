import {
  BookServiceClient,
  ServiceError,
}                     from '../../generated/examples/books_pb_service'
import {
  Empty,
  BookList,
  Book,
  BookIdRequest,
}                     from '../../generated/examples/books_pb'

const client = new BookServiceClient('https://localhost:50051')

const empty = new Empty()

function printResponse(error: ServiceError, response: Book | BookList | null) {
  if (error)
    console.log('Error: ', error)
  else
    console.log(response)
}

function listBooks() {
  client.list(empty, function(error, books) {
    printResponse(error, books)
  })
}

function insertBook(id: string, title: string, author: string) {
  const book = new Book
  book.setId(parseInt(id))
  book.setTitle(title)
  book.setAuthor(author)
  client.insert(book, function(error, _) {
    printResponse(error, null)
  })
}

function getBook(id: string) {
  const request = new BookIdRequest()
  request.setId(parseInt(id))
  client.get(request, function(error, book) {
    printResponse(error, book)
  })
}

function deleteBook(id: string) {
  const request = new BookIdRequest()
  request.setId(parseInt(id))
  client.delete(request, function(error, _) {
    printResponse(error, null)
  })
}

// add the following section
function watchBooks() {
  const call = client.watch(empty)
  call.on('data', function(book) {
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
