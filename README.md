# Egzaminas
# Renginių Valdymo Sistema

Ši sistema leidžia vartotojams prisijungti, kurti renginius ir valdyti vartotojus bei renginius per administratoriaus panelę.

---

## Reikalavimai
- [Node.js](https://nodejs.org/)
- [MySQL](https://www.mysql.com/) arba [XAMPP](https://www.apachefriends.org/)

---

## Paleidimo Instrukcijos

### 1. Atsisiųskite Projektą
1. Nukopijuokite projekto failus į savo kompiuterį.
2. Įsitikinkite, kad kataloge yra failai: `server.js`, `public/` ir `renginiai.sql`.

### 2. Duomenų Bazės Sukūrimas
1. Atidarykite MySQL terminalą:
   ```bash
   mysql -u root -p 

2. Sukurkite duomenų bazę ir importuokite struktūrą:
CREATE DATABASE renginiai;
USE renginiai;
SOURCE /pilnas_kelias/iki/renginiai.sql;

3. terminale npm install

4. Serverio Paleidimas

Paleiskite serverį:
terminale 
cd Egzaminas/
cd renginiu-valdymas/
node server.js

Jei paleidimas sėkmingas, matysite pranešimą:

Serveris paleistas ir veikia ant prievado 3000
Prisijungta prie duomenų bazės!


Prisijungimai: 
admino: admin@example.com pass: admin
user: test@gmail.com pass: test