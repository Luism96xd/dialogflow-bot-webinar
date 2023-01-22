const express = require('express');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion, Payload} = require('dialogflow-fulfillment');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const serviceAccount = require(process.env.SERVICE_ACCOUNT_PATH);

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({orign: true}));
app.use(express.urlencoded({extended: false}));

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/webhook', (req, res) => {
    const agent = new WebhookClient({ request: req, response : res});
    //console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers) + "\n");
    //console.log('Dialogflow Request body: ' + JSON.stringify(req.body));
    
    const result = req.body.queryResult;

    function welcome(agent) {
        agent.add(`¡Bienvenido a mi agente!`);
    }

    function fallback(agent) {
        agent.add(`No he entendido tu petición`);
        agent.add('Disculpa, no entendí, podrías repetir por favor');
    }

    function webhook(agent){
        agent.add('Enviando mensaje desde el webhook');
    }

    function crearPedido(agent){
        let ID = Date.now();
        let Nombre   = agent.parameters['nombre'];
        let Apellido = agent.parameters['apellido'];
        let Email  = agent.parameters['email'];
        let Telefono  = agent.parameters['telefono'];

        let pais = agent.parameters['direccion'].country;
        let ciudad = agent.parameters['direccion'].city;
        let estado = agent.parameters['direccion']['admin-name'];
        let zipCode = agent.parameters['direccion']['zip-code'];
        
        let Direccion = [ciudad, estado, pais, zipCode].join(', ');
        
        let pedido = agent.context.get('comida').parameters;

        let Producto = pedido['tipodecomida'];
        let Cantidad = pedido['cantidad'];

        let Estatus = 'PENDIENTE';

        axios.post('https://sheet.best/api/sheets/68176ab9-8608-4f06-bd14-17c2d2b3a1d5',
            {ID, Nombre, Apellido, Email, Telefono, Direccion, Producto, Cantidad, Estatus}
        )

        agent.add(`Listo, tu pedido ha sido registrado satisfactoriamente. Tu número de seguimiento es: ${ID}`)
    }

    async function registrarUsuario(agent){
        let nombre = agent.parameters['nombre'].toString();
        let apellido = agent.parameters['apellido'].toString();
        let cedula = agent.parameters['cedula'].toString();
        let email = agent.parameters['email'];
        let username = nombre + apellido;
        let createdAt = Date.now();

        const db = admin.firestore();

        const usuario = db.collection('usuarios').doc(cedula);

        await usuario.set({
            nombre: nombre,
            apellido: apellido,
            username: username,
            email: email,
            cedula: cedula,
            createdAt: createdAt
        }); 

        agent.add(`¡Perfecto, ${nombre}! Tus datos han sido guardados satisfactoriamente`)
    }

    async function consultarUsuario(agent){
        let cedula = agent.parameters['cedula'].toString();

        const db = admin.firestore();
        const userRef = db.collection('usuarios').doc(cedula);
        const usuario = await userRef.get();

        try{
            if(!usuario.exists){
                console.log("El usuario no está en la base de datos");
                agent.add("No hemos encontrado un usuario con esa cédula");
            }else{
                const data = usuario.data();

                let nombre = data['nombre'];
                let apellido = data['apellido'];
                let email = data['email'];
                let username = data['username'];

                agent.add(`Los datos del usuario con la cédula ${cedula} son:\nNombre: ${nombre}\nApellido: ${apellido}\nEmail: ${email}\nNombre de usuario: ${username}`);
            }
        }catch(error){
            console.log(error);
            agent.add('Ha ocurrido un error al consultar la base de datos');
        }
    }


    async function enviarCorreo(){
        let email = agent.parameters['email'];
        let consentimiento = agent.parameters['consentimiento'];

        console.log(email, consentimiento);

        if (['si', 'sí', 'de acuerdo'].includes(consentimiento.toLowerCase())){
            const msg = {
                to: email, // Change to your recipient
                from: process.env.SENDGRID_SENDER, // Change to your verified sender
                templateId: 'd-1d1f9a976dd64bcf8fd0cf45bf0ff808'    
            }
            try{
                let response = await sgMail.send(msg);
                console.log(response[0].statusCode);
                console.log('Email sent');
                agent.add('Se ha enviado un correo a tu direción ' + email + " con las diapositivas de la clase ¡Gracias!");
            }
            catch(error){
                console.error(error);
                agent.add("Ha ocurrido un error al enviar el email");
            }
           
        }
    }

    async function consultarPedido(agent){
        let NroSeguimiento = agent.parameters['NroSeguimiento'];

        let respuesta = await axios.get('https://sheet.best/api/sheets/68176ab9-8608-4f06-bd14-17c2d2b3a1d5/ID/' + NroSeguimiento);
    
        let pedidos = respuesta.data;
        if (pedidos.length > 0){
            let pedido = pedidos[0];
            agent.add("El estatus de tu pedido es: "+ pedido.Estatus);
        }else{
            agent.add("No se ha encontrado ningún pedido con el número de seguimiento que has proporcionado");
        }
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('webhook', webhook);
    intentMap.set('Archivo', enviarCorreo);
    intentMap.set('Pedidos.crear - yes', crearPedido);
    intentMap.set('Pedidos.consultar', consultarPedido);
    intentMap.set('Usuarios.registrar', registrarUsuario);
    intentMap.set('Usuarios.consultar', consultarUsuario);

    agent.handleRequest(intentMap);

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})