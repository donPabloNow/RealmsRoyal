var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var helmet = require('helmet');
var mongoose = require('mongoose');
var Server = require('./models/server');
var setupLocationEndpoints = require('./endpoints/location');
var setupServerEndpoints = require('./endpoints/server');
var setupUserEndpoints = require('./endpoints/user');

var app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

var server = app.listen(process.env.PORT || 8080, () => {
    console.log(`Listening on port: ${server.address().port}`);
    process.nextTick(() => Server.refresh());
    setInterval(() => Server.refresh(), 600000);
});

app.set('CLIENT_URL', process.env.CLIENT_URL || 'https://realmsroyal.obeyi.com/');
app.set('PUBLIC_URL', process.env.PUBLIC_URL || 'https://realmsroyal.obeyi.com/auth/');
setupLocationEndpoints(app);
setupServerEndpoints(app);
setupUserEndpoints(app);
app.use((req, res) => res.status(404).end());
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(500).end());

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/realmsroyal');