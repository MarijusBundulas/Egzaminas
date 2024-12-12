const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer'); 
const app = express();
app.use(bodyParser.json());
app.use(cors());


const storage = multer.memoryStorage();
const upload = multer({ storage });

const SECRET_KEY = 'slaptazodis';


app.use(express.static(path.join(__dirname, 'public')));


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'renginiai',
});

db.connect(err => {
  if (err) {
    console.error('Nepavyko prisijungti prie duomenų bazės:', err);
    return;
  }
  console.log('Prisijungta prie duomenų bazės!');
});


app.post('/api/register', async (req, res) => {
  const { vardas, el_pastas, slaptazodis } = req.body;
  const hashedPassword = await bcrypt.hash(slaptazodis, 10);

  const sql = 'INSERT INTO Vartotojai (vardas, el_pastas, slaptazodis) VALUES (?, ?, ?)';
  db.query(sql, [vardas, el_pastas, hashedPassword], err => {
    if (err) return res.status(500).send(err);
    res.status(201).send('Vartotojas užregistruotas!');
  });
});


app.post('/api/login', (req, res) => {
  const { el_pastas, slaptazodis } = req.body;

  const sql = 'SELECT * FROM Vartotojai WHERE el_pastas = ?';
  db.query(sql, [el_pastas], async (err, results) => {
    if (err || results.length === 0) return res.status(401).send('Neteisingi prisijungimo duomenys.');
    const vartotojas = results[0];

   
    if (vartotojas.uzblokuotas) {
      return res.status(403).send('Jūsų paskyra yra užblokuota. Susisiekite su administratoriumi.');
    }

    const isPasswordValid = await bcrypt.compare(slaptazodis, vartotojas.slaptazodis);
    if (!isPasswordValid) return res.status(401).send('Neteisingi prisijungimo duomenys.');

    const token = jwt.sign({ id: vartotojas.vartotojo_id, role: vartotojas.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});


function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send('Autentifikacija reikalinga.');

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send('Neteisingas ar pasibaigęs tokenas.');
    req.user = user;
    next();
  });
}


app.post('/api/renginiai', upload.single('nuotrauka'), (req, res) => {
  const { pavadinimas, data_laikas, vieta, kategorija } = req.body;
  const nuotrauka = req.file ? req.file.buffer : null;

  const sql = `INSERT INTO Renginiai (pavadinimas, data_laikas, vieta, kategorija, nuotrauka)
               VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [pavadinimas, data_laikas, vieta, kategorija, nuotrauka], (err, results) => {
    if (err) {
      console.error('Klaida pridedant renginį:', err);
      return res.status(500).send('Nepavyko pridėti renginio');
    }
    res.status(201).send('Renginys sėkmingai pridėtas!');
  });
});


app.get('/api/events', (req, res) => {
  const sql = 'SELECT renginio_id, pavadinimas, vieta, data_laikas, nuotrauka FROM Renginiai WHERE patvirtintas = 1';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Klaida gaunant renginius:', err);
      return res.status(500).send('Nepavyko gauti renginių');
    }

    const renginiai = results.map(event => ({
      ...event,
      nuotrauka: event.nuotrauka ? event.nuotrauka.toString('base64') : null,
    }));

    res.json(renginiai);
  });
});


app.get('/api/admin/events', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'SELECT * FROM Renginiai WHERE patvirtintas = FALSE';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});


app.put('/api/admin/approve/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'UPDATE Renginiai SET patvirtintas = TRUE WHERE renginio_id = ?';
  db.query(sql, [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.status(200).send('Renginys patvirtintas!');
  });
});


app.delete('/api/admin/reject/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'DELETE FROM Renginiai WHERE renginio_id = ?';
  db.query(sql, [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.status(200).send('Renginys atmestas!');
  });
});


app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'SELECT vartotojo_id, vardas, el_pastas, uzblokuotas FROM Vartotojai';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});


app.put('/api/admin/block/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'UPDATE Vartotojai SET uzblokuotas = TRUE WHERE vartotojo_id = ?';
  db.query(sql, [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.status(200).send('Vartotojas užblokuotas!');
  });
});


app.put('/api/admin/unblock/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Prieiga tik administratoriui.');
  const sql = 'UPDATE Vartotojai SET uzblokuotas = FALSE WHERE vartotojo_id = ?';
  db.query(sql, [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.status(200).send('Vartotojas atblokuotas!');
  });
});


app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ role: req.user.role });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveris paleistas ir veikia ant prievado ${PORT}`);
});
