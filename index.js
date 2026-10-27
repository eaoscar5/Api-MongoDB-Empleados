require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const empleadoSchema = new mongoose.Schema(
  {
    Clave: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'La Clave debe ser un numero entero.'
      }
    },
    Nombre: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    fechadenacimiento: { type: Date, required: true },
    sexo: { type: String, required: true, trim: true },
    tipodesangre: { type: String, required: true, trim: true }
  },
  { versionKey: false }
);

// coleccion 'Empleados' en MongoDB Atlas, con el esquema empleadoSchema.
const Empleado = mongoose.model('Empleado', empleadoSchema, 'Empleados');

function obtenerClave(parametro) {
  const clave = Number(parametro);
  return Number.isSafeInteger(clave) && clave > 0 ? clave : null;
}

function manejarError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({ mensaje: 'Ya existe un empleado con esa Clave.' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ mensaje: error.message });
  }
  console.error(error);
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}

app.get('/', (req, res) => {
  res.json({ mensaje: 'API Empleados disponible', ruta: '/api/empleados' });
});

// GET: consultar todos los empleados.
app.get('/api/empleados', async (req, res) => {
  try {
    const empleados = await Empleado.find().sort({ Clave: 1 });
    res.json(empleados);
  } catch (error) {
    manejarError(res, error);
  }
});

// GET: consultar un empleado por su clave numerica.
app.get('/api/empleados/:clave', async (req, res) => {
  const clave = obtenerClave(req.params.clave);
  if (clave === null) return res.status(400).json({ mensaje: 'Clave invalida.' });
  try {
    const empleado = await Empleado.findOne({ Clave: clave });
    if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    res.json(empleado);
  } catch (error) {
    manejarError(res, error);
  }
});

// POST: registrar un empleado.
app.post('/api/empleados', async (req, res) => {
  try {
    const empleado = await Empleado.create(req.body);
    res.status(201).json(empleado);
  } catch (error) {
    manejarError(res, error);
  }
});

// PUT: actualizar los cinco datos editables de un empleado existente.
app.put('/api/empleados/:clave', async (req, res) => {
  const clave = obtenerClave(req.params.clave);
  if (clave === null) return res.status(400).json({ mensaje: 'Clave invalida.' });
  if (req.body.Clave !== undefined && Number(req.body.Clave) !== clave) {
    return res.status(400).json({ mensaje: 'No se permite cambiar la Clave.' });
  }
  const campos = ['Nombre', 'direccion', 'fechadenacimiento', 'sexo', 'tipodesangre'];
  if (campos.some(campo => !Object.prototype.hasOwnProperty.call(req.body, campo))) {
    return res.status(400).json({ mensaje: 'PUT requiere Nombre, direccion, fechadenacimiento, sexo y tipodesangre.' });
  }
  const datos = Object.fromEntries(campos.map(campo => [campo, req.body[campo]]));
  try {
    const empleado = await Empleado.findOneAndUpdate(
      { Clave: clave },
      { $set: datos },
      { new: true, runValidators: true }
    );
    if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    res.json(empleado);
  } catch (error) {
    manejarError(res, error);
  }
});

// DELETE: eliminar un empleado por clave.
app.delete('/api/empleados/:clave', async (req, res) => {
  const clave = obtenerClave(req.params.clave);
  if (clave === null) return res.status(400).json({ mensaje: 'Clave invalida.' });
  try {
    const empleado = await Empleado.findOneAndDelete({ Clave: clave });
    if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    res.json({ mensaje: 'Empleado eliminado correctamente.', empleado });
  } catch (error) {
    manejarError(res, error);
  }
});

const PORT = process.env.PORT || 3000;
async function iniciar() {
  if (!process.env.MONGO_URI) {
    console.error('Falta configurar MONGO_URI.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB Atlas.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error de conexion a MongoDB Atlas:', error.message);
    process.exit(1);
  }
}
iniciar();
