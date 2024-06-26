// const si = require('systeminformation');
const si = require('systeminformation');
const axios = require('axios');
const os = require('os');
const http = require('http');

async function fetchIpAddress() {
    return new Promise((resolve, reject) => {
        http.get('http://api.ipify.org/', (resp) => {
            let ipBuffer = '';

            resp.on('data', (chunk) => {
                ipBuffer += chunk;
            });

            resp.on('end', () => {
                addr = ipBuffer.toString().trim();
                resolve(addr);
                ipz = addr;
            });

            resp.on('error', (error) => {
                reject(error);
            });
        });
    });
}

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: collectInfo <email> <setup-id>');
    process.exit(1);
}
const email = args[0];
const setupId = args[1];

async function sendSystemInfo() {
    try {
        const system = await si.system();
        const osInfo = await si.osInfo();
        const cpu = await si.cpu();
        const mem = await si.mem();
        const battery = await si.battery();
        const diskLayout = await si.diskLayout();
        const ip = await fetchIpAddress();
        const network = await axios.post(`http://ip-api.com/json/${ip}`);
        const { city, lon, lat } = network.data;
        if (!lon || !lat) return console.log('Issues getting device location');

        const systemInfo = {
            city,
            lon,
            lat,
            email,
            setupId,
            system,
            osInfo,
            cpu,
            mem,
            battery,
            diskLayout,
        };
        console.log('Working...');
        await axios
            .post('https://itsa-hackathon.onrender.com/api/sub-admin/register-device', systemInfo)
            .then((response) => {
                console.log('Done');
                console.log(response.data.message);
                process.exit(1);
            });
        process.exit(1);
    } catch (error) {
        console.log('Error sending system information:', error.response.data);
    }
}

sendSystemInfo();
