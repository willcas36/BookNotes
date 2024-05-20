import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import pg from 'pg';

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "bookNotes",
    password: "edsowime84",
    port: 5432,
  });
db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let books = {};
async function getBooks(){
    const items = await db.query("SELECT * FROM books");
    books = items.rows;
}
async function getBook(id){
    const item = await db.query("SELECT * from books where id = $1",[id]);
    //console.log(item);
    return item.rows;
}
app.get('/', async (req, res) => {
    try{
        await getBooks();
        res.render('index.ejs',{
            books: books,

        }) 
    }catch(error){  
        res.status(500).json({message: error.message});
}
});
app.get('/newBook', async (req, res) => {
    try{
        //console.log(book[0]);
        res.render('newBook.ejs',{
            heading: "New Book",
            submit: "Create Book" 
        });
    }catch(error){  
        
        res.status(500).json({message: error.message});
    }
});
app.post('/newBook', async (req, res) => {
    try {
        const metadata= await axios.get(`https://openlibrary.org/search.json?q=${req.body.title}`);
        const coverId = metadata.data.docs[0].cover_i;
        const author = metadata.data.docs[0].author_name[0];
        const title = metadata.data.docs[0].title;
        const rate = req.body.rate;
        const summary = req.body.summary;
        //console.log(metadata.data.docs[0].cover_i);
        //console.log(metadata.data.docs[0].author_name[0]);
        //console.log(metadata.data.docs[0].title);
        await db.query("insert into books (title, author, summary, rate, coverid) values ($1,$2,$3,$4, $5)", [title, author, summary, rate, coverId]);
        res.redirect('/');

    } catch (error) {
        res.status(500).json({message: error.message});
    }
});
app.get('/book/:id/edit', async (req, res) => {
    try {
        const book = await getBook(req.params.id);
        console.log(book[0]);
        res.render('newBook.ejs',{
            book: book[0],
            heading: "Edit Book",
            submit: "Update Book" 
    })
    } catch (error) {
        res.status(500).json({message: error.message});
    }
});
app.post('/book/:id/edit', async (req, res) => {
    try {
        await db.query("UPDATE books SET title = $1, rate = $2, author = $3, summary= $4 WHERE id = $5",[req.body.title, req.body.rate, req.body.author, req.body.summary, req.params.id]);
        res.redirect('/');
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.get('/book/:id/delete', async (req, res) => {
    try {

        await db.query("DELETE FROM notes WHERE bid = $1",[req.params.id]);
        await db.query("DELETE FROM books WHERE id = $1",[req.params.id]);
        res.redirect('/');
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.get("/book/:id/notes", async (req, res) => {
    try {
        console.log(req.params.id);
        const value = await db.query("SELECT notes.id, notes.content, notes.page, notes.bid FROM notes join books on books.id = notes.bid where books.id= $1 ",[req.params.id]);
        const notes = value.rows;
        console.log(notes);
       // console.log(value);
        const book = await getBook(req.params.id);
        res.render('bookNotes.ejs',{
            notes: notes,
            book: book[0]
        })
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.get('/book/newNote/:id', async (req, res) => {
    try {
        res.render('newBook.ejs',{
            id: req.params.id,
            heading: 'New Note',
            submit: 'Create Note'
        })
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.post('/book/newNote/:id', async (req, res) => {
    try {
        console.log(req.params.id);
        await db.query("insert into notes (content, page, bid) values ($1,$2, $3)", [req.body.content, req.body.page, req.params.id]);
        res.redirect(`/book/${req.params.id}/notes`);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.get('/book/:bid/note/:nid/edit', async (req, res) => {
    try {
        const value = await db.query("SELECT * FROM notes where id = $1",[req.params.nid]);
        const note = value.rows;
        console.log('note id: ' + req.params.nid);
        console.log('book id: ' + req.params.bid);
        console.log(note);
        res.render('newBook.ejs',{
            note: note[0],
            nid: req.params.nid,
            bid: req.params.bid,
            heading: 'Edit Note',
            submit: 'Update Note'
        })
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.post('/book/:bid/note/:nid/edit', async (req, res) => {
    try {
        await db.query("UPDATE notes SET content=$1, page=$2 WHERE id = $3",[req.body.content, req.body.page, req.params.nid]);
        res.redirect(`/book/${req.params.bid}/notes`);
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})
app.get('/book/:bid/note/:nid/delete', async (req, res) =>{
    try {
        await db.query("DELETE FROM notes WHERE id = $1",[req.params.nid]);
        res.redirect(`/book/${req.params.bid}/notes`);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})
app.listen(port,() =>{
    console.log(`listening on port ${port}`);
});