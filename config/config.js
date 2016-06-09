var ENV_PARAMETER = 'env';
var HTTP_PORT_PARAMETER = 'http-port';
var TCP_PORT_PARAMETER = 'tcp-port';

var env = {
  development: require('./environments/development.json'),
  production: require('./environments/production.json')
};
var argv = require('minimist')(process.argv.slice(2));
optionalEnv = argv[ENV_PARAMETER];
optionalHttpPort = argv[HTTP_PORT_PARAMETER];
optionalTcpPort = argv[TCP_PORT_PARAMETER];

nodeEnv = optionalEnv == null ? 'development' : optionalEnv;
var config = env[nodeEnv];
if(optionalHttpPort !== undefined && optionalHttpPort!==null) config.HTTP_PORT = optionalHttpPort;
if(optionalTcpPort !== undefined &&optionalTcpPort!==null) config.TCP_PORT = optionalTcpPort;

exports.config = config;

