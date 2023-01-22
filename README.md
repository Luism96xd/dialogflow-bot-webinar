#Chatbot utilizando Dialogflow, Firebase y Node.JS

Este chatbot es capaz de responder preguntas frecuentes, guardar y leer datos de una base de datos de Firestore, agregar filas a una hoja de cálculo de Google y luego consultar el estatus de un pedido. Se utilizó la API de SendGrid para enviar correos y notificar a los usuarios y se usó Firebase Storage para almacenar archivos y luego ser enviados mediante una interacción con el chatbot. 

Se ha creado un servidor web utilizando Express.JS para crear el webhook.

##Módulos necesarios:
dialogflow-fulfillment
actions-on-google
@google-cloud/dialogflow
@google-cloud/local-auth
firebase-admin
cors
axios
dotenv
googleapis
express