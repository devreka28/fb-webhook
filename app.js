/**
 * Copyright 2019-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `yarn install`
 * 3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
 */

'use strict';

// Use dotenv to read .env vars into Node
require('dotenv').config();

// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  { urlencoded, json } = require('body-parser'),
  app = express();

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));

// Parse application/json
app.use(json());

// Respond with 'Hello World' when a GET request is made to the homepage
app.get('/', function (_req, res) {
  res.send('Hello World');
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  // const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const VERIFY_TOKEN = "verifyToken";

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPsid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
        //let options = ["Yes", "No"];
        //sendQuickReplyToFb(senderPsid, "Please select one of the following:", options);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {

    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Handles messages events
function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Checks if the message contains text
  if (receivedMessage.text) {    

    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API

    setRequestPayload(senderPsid, receivedMessage.text);
    sendRequest(senderPsid);

    let responseFromWatson = global.data[senderPsid].responsePayload.output.text[0]

    

    if (isJson(responseFromWatson)){
        console.log("response from watson is json")
        // options as response
        response = getQuickReplyResponse(responseFromWatson)
    } else {
      // normal text response
      console.log("response from watson is text")
      response = {
        'text': global.data[senderPsid].responsePayload.output.text[0]
      };
    }

    
  } else if (receivedMessage.attachments) {

    // Get the URL of the message attachment
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [{
            'title': 'Is this the right picture?',
            'subtitle': 'Tap a button to answer.',
            'image_url': attachmentUrl,
            'buttons': [
              {
                'type': 'postback',
                'title': 'Yes!',
                'payload': 'yes',
              },
              {
                'type': 'postback',
                'title': 'No!',
                'payload': 'no',
              }
            ],
          }]
        }
      }
    };
  }

  // Send the response message
  callSendAPI(senderPsid, response);
}

function isJson(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}

global.data = {};

function setRequestPayload(senderPsid, text) {
  // check if user is in json
  if (!global.data.hasOwnProperty(senderPsid)) {
    console.log("New sender");
    global.data[senderPsid] = {requestPayload :{input: {text: {}}, context: {}}, responsePayload: {}};
    global.data[senderPsid].requestPayload.input.text = text
  } else {
    console.log("Sender found");
    global.data[senderPsid].requestPayload.input.text = text;
    global.data[senderPsid].requestPayload.context = global.data[senderPsid].responsePayload.context;
  }
}

function  sendRequest(senderPsid) {

    // Built http request
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

  var data = JSON.stringify(global.data[senderPsid].requestPayload);

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      global.data[senderPsid].responsePayload = JSON.parse(xhr.responseText);
      console.log("response - input:");
      console.log(JSON.stringify(global.data[senderPsid].responsePayload.input));

    }
  });

  xhr.open("POST", "https://watson-banking-chatbot-20190503145658121.eu-gb.mybluemix.net/api/message", false);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "*/*");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("cache-control", "no-cache");

  xhr.send(data);

  }





// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { 'text': 'Thanks!' };
  } else if (payload === 'no') {
    response = { 'text': 'Aww jeez, try sending another image.' };
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response);
}



function getQuickReplyResponse(responseFromWatson) {
  
//console.log(replyOptions)

  let response = {
    "text": responseFromWatson.text,
    "quick_replies": [    
    ]
  }

  responseFromWatson.options.forEach(function(option) {
    console.log(option)
    response.quick_replies.push(createQuickReply(option))
  })

  console.log(JSON.stringify(response))

 

};

function createQuickReply(title)  {
  return {
    "content_type":"text",
    "title": title,
    "payload":""
  }
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {

  // The page access token we have generated in your app settings
  const PAGE_ACCESS_TOKEN = "EAAFiqFit2bwBANEPfDHJrAyfHdAziy41EuZCpaMZB0KM6YMpcahArNC2p6ZBouysGIRipAOxp2cz4mSe4OzzpZC2DmRanRmdhPDdYJGfjoAiorgCbgNcxA4FugqhNQQKiVfj7wu1da4aDc8kfZBcacEeNpW6ZApl2ha5zR333O2gZDZD";

  // Construct the message body
  let requestBody = {
    'recipient': {
      'id': senderPsid
    },
    'message': response
  };
  

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
      console.log('-------------------------------------------');
    } else {
      console.error('Unable to send message:' + err);
    }
  });
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});





// // standard message
// curl -X POST -H "Content-Type: application/json" -d '{
//   "recipient":{
//     "id":"1992633584176057"
//   },
//   "message":{
//     "text": "Here is a some text!"
//   }
// }' "https://graph.facebook.com/v2.6/me/messages?access_token=EAAFiqFit2bwBANEPfDHJrAyfHdAziy41EuZCpaMZB0KM6YMpcahArNC2p6ZBouysGIRipAOxp2cz4mSe4OzzpZC2DmRanRmdhPDdYJGfjoAiorgCbgNcxA4FugqhNQQKiVfj7wu1da4aDc8kfZBcacEeNpW6ZApl2ha5zR333O2gZDZD"


// // yes/no quick reply
// curl -X POST -H "Content-Type: application/json" -d '{
//   "recipient":{
//     "id":"1992633584176057"
//   },
//   "message":{
//     "text": "Here is a quick reply!",
//     "quick_replies":[
//       {
//         "content_type":"text",
//         "title":"Yes",
//         "payload":""
//       },
//       {
//         "content_type":"text",
//         "title":"No",
//         "payload":""
//       },
//     ]
//   }
// }' "https://graph.facebook.com/v2.6/me/messages?access_token=EAAFiqFit2bwBANEPfDHJrAyfHdAziy41EuZCpaMZB0KM6YMpcahArNC2p6ZBouysGIRipAOxp2cz4mSe4OzzpZC2DmRanRmdhPDdYJGfjoAiorgCbgNcxA4FugqhNQQKiVfj7wu1da4aDc8kfZBcacEeNpW6ZApl2ha5zR333O2gZDZD"
