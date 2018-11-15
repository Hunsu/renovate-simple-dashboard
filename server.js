// Environment variable config see README.env for example
require('dotenv').config();
// server setup
const cluster = require('cluster');
const debug = require('debug')('quiddity:server');
const http = require('http');
const numCPUs = require('os').cpus().length;
const port = normalizePort(process.env.PORT || '3000');
// express/next setup
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const next = require('next');
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev });
const handle = app.getRequestHandler();
// server routes
const index = require('./server/routes/index');
const about = require('./server/routes/about');
const articles = require('./server/routes/articles');
const api = require('./server/routes/api');


app.prepare().then(() => {
    const server = express();

    // security - like to not display the backend is built on express ;)
    server.disable('x-powered-by');

    // server auth - if you want to password protect a staging site here's a nice easy way to do it
    if (process.env.BASIC_AUTH_ENABLED === 'true') {
        const basicAuth = require('express-basic-auth');
        let users = {};
        users[process.env.BASIC_AUTH_USERNAME] = process.env.BASIC_AUTH_PASSWORD;

        server.use(basicAuth({
            users,
            challenge: true,
            realm: 'Imb4T3st4pp'
        }));
    }

    // logs
    server.use(logger('dev'));

    // configs
    server.use(bodyParser.urlencoded({ extended: false }));
    server.use(bodyParser.json());

    // setup server routes
    server.use('/', index);
    server.use('/about', about);
    server.use('/articles', articles);
    server.use('/api', api);
    
    // next/js routes that don't require backend routes
    server.get('*', (req, res) => {
        return handle(req, res);
    });

    server.set('port', port);

    // setup workers for concurrency
    if (cluster.isMaster) {
        // Fork workers.
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
    
        // If a worker dies, log it to the console and start another worker.
        cluster.on('exit', (worker, code, signal) => {
            console.log('Worker ' + worker.process.pid + ' died.');
            cluster.fork();
        });
    
        // Log when a worker starts listening
        cluster.on('listening', (worker, address) => {
            console.log('Worker started with PID ' + worker.process.pid + '.');
        });
        
    } else {
        //Create HTTP server.
        let ns = http.createServer(server);

        // Listen on provided port, on all network interfaces.    
        ns.listen(port);
    
        ns.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
    
            const bind = typeof port === 'string'
                ? 'Pipe ' + port
                : 'Port ' + port;
    
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    console.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(bind + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });
    
        ns.on('listening', () => {
            const addr = ns.address();
            const bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port;
            debug('Listening on ' + bind);
        });
    }

})
.catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	let port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}
