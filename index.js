const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const express = require('express');
const opn = require('opn');
const path = require('path');
const app = express();


const oauth2Client = new OAuth2(
    '670474004412-0lt7o1q56a4v738thb1gfsnf4f25u3lu.apps.googleusercontent.com',
    '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',
  'http://localhost:3000/oauth2callback'
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  opn(authUrl);
  res.send('Authentication started');
});

app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oauth2Client.setCredentials(token);
    res.send('Authenticated successfully');
  });
});

function getTextFromPart(part) {
    if (part.mimeType === 'text/plain') {
      return Buffer.from(part.body.data, 'base64').toString();
    }
    if (part.parts) {
      return part.parts.map(getTextFromPart).join('');
    }
    return '';
  }

  app.get('/read-mails', (req, res) => {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
    const htmlStart = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.0.3/dist/tailwind.min.css" rel="stylesheet">
        <title>Emails</title>
      </head>
      <body class="bg-gray-100">
    `;
  
    const htmlEnd = `
      </body>
      </html>
    `;
  
    gmail.users.messages.list({ userId: 'me', maxResults: 10 }, (err, response) => {
      if (err) return res.status(400).send(`The API returned an error: ${err}`);
      const messages = response.data.messages;
      if (messages && messages.length > 0) {
        let emailData = [];
        messages.forEach((message, index) => {
          gmail.users.messages.get({ userId: 'me', id: message.id }, (err, email) => {
            if (err) return res.status(400).send(`The API returned an error: ${err}`);
  
            const subject = email.data.payload.headers.find(header => header.name === 'Subject').value;
            const body = getTextFromPart(email.data.payload);
  
            emailData.push({ subject, body });
            if (emailData.length === messages.length) {
              let emailString = emailData.map((email, i) => {
                return `
                  <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl my-4">
                    <div class="md:flex">
                      <div class="p-8">
                        <h2 class="text-2xl font-bold">${email.subject}</h2>
                        <p class="mt-2 text-gray-500">${email.body}</p>
                      </div>
                    </div>
                  </div>`;
              }).join('');
  
              res.send(htmlStart + emailString + htmlEnd); // Combine HTML start, email content, and HTML end
            }
          });
        });
      } else {
        res.send('No messages found.');
      }
    });
  });
  
  
  
//   app.get('/read-mails', (req, res) => {
//     const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
//     gmail.users.messages.list({ userId: 'me', maxResults: 10 }, (err, response) => {
//       if (err) return res.status(400).send(`The API returned an error: ${err}`);
//       const messages = response.data.messages;
//       if (messages && messages.length > 0) {
//         let emailData = [];
//         messages.forEach((message, index) => {
//           gmail.users.messages.get({ userId: 'me', id: message.id }, (err, email) => {
//             if (err) return res.status(400).send(`The API returned an error: ${err}`);
  
//             // Extracting the subject
//             const subject = email.data.payload.headers.find(header => header.name === 'Subject').value;
  
//             // Extracting the body
//             const body = getTextFromPart(email.data.payload);
  
//             emailData.push({ subject, body });
//             if (emailData.length === messages.length) {
//               let emailString = emailData.map((email, i) => {
//                 return `<h2>Email ${i + 1}: ${email.subject}</h2><p>${email.body}</p>`;
//               }).join('<hr/>');
//               res.send(emailString); // Send emails data as HTML response
//             }
//           });
//         });
//       } else {
//         res.send('No messages found.');
//       }
//     });
//   });
  
  
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

