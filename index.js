const express = require('express');
const bodyParser = require('body-parser');
const crypto = require("crypto");
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JasPay SpeedPoint</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f0f0f0;
            }
            .container {
                text-align: center;
                background-color: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #333;
            }
            p {
                color: #666;
            }
            button {
                background-color: #4CAF50;
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                margin-top: 20px;
                cursor: pointer;
                border-radius: 4px;
                transition: background-color 0.3s;
            }
            button:hover {
                background-color: #45a049;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome To JasPay - SpeedPoint</h1>
            <p>This is version 1 of the API</p>
            <form action="/checkout" method="POST">
                <input type="hidden" name="merchant_id" value="10000100">
                <input type="hidden" name="merchant_key" value="46f0cd694581a">
                <input type="hidden" name="return_url" value="https://www.example.com/success">
                <input type="hidden" name="cancel_url" value="https://www.example.com/cancel">
                <input type="hidden" name="notify_url" value="https://www.example.com/notify">
                <button type="submit">Run Update Balance</button>
            </form>
        </div>
    </body>
    </html>
  `;
    res.send(html);
});

app.post('/checkout', (req, res) => {

    const formData = {
        merchant_id: "10000100",
        merchant_key: "46f0cd694581a",
        return_url: "https://www.example.com/success",
        cancel_url: "https://www.example.com/cancel",
        notify_url: "https://www.example.com/notify",
        name_first: "Sibusiso",
        name_last: "Ndlovu",
        email_address: "sibusiso@jaspa.co.za",
        cell_number: "0837435269",
        m_payment_id: "FirestoreId",
        amount: "5000.00",
        item_name: "MacBook Purchase",
        item_description: "Second hand macbook from facebook marketplace",

    };

    // Log the received data
    console.log('Received checkout data:', formData);

    const generateSignature = (data, passPhrase = null) => {
        // Create parameter string
        let pfOutput = "";
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                if (data[key] !== "") {
                    pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`
                }
            }
        }

        // Remove last ampersand
        let getString = pfOutput.slice(0, -1);
        if (passPhrase !== null) {
            getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
        }

        return crypto.createHash("md5").update(getString).digest("hex");
    };

    const myData = [];
    myData["merchant_id"] = formData['merchant_id'];
    myData["merchant_key"] = formData['merchant_key'];
    myData["return_url"] = formData['return_url'];
    myData["cancel_url"] = formData['cancel_url'];
    myData["notify_url"] = formData['notify_url'];
    myData["name_first"] = formData['name_first'];
    myData["name_last"] = formData['name_last'];
    myData["email_address"] = formData['email_address'];
    myData["m_payment_id"] = formData['m_payment_id'];
    myData["amount"] = formData['amount'];
    myData["item_name"] = formData['item_name'];

    const myPassphrase = "jt7NOE43FZPn";
    myData["signature"] = generateSignature(myData, myPassphrase);

    let htmlForm = `<form action="https://${pfHost}/eng/process" method="post">`;
    for (let key in myData) {
        if (myData.hasOwnProperty(key)) {
            value = myData[key];
            if (value !== "") {
                htmlForm += `<input name="${key}" type="hidden" value="${value.trim()}" />`;
            }
        }
    }

    htmlForm += '<input type="submit" value="Pay Now" /></form>';


    res.json({
        message: 'Checkout data received successfully',
        data: formData
    });
});

app.post('/notify', (req, res) => {
    const testingMode = true;
    const pfHost = testingMode ? "sandbox.payfast.co.za" : "www.payfast.co.za";

    const pfData = JSON.parse(JSON.stringify(req.body));

    let pfParamString = "";
    for (let key in pfData) {
        if (pfData.hasOwnProperty(key) && key !== "signature") {
            pfParamString += `${key}=${encodeURIComponent(pfData[key].trim()).replace(/%20/g, "+")}&`;
        }
    }

    pfParamString = pfParamString.slice(0, -1);

    const pfValidSignature = (pfData, pfParamString, pfPassphrase = null) => {
        // Calculate security signature
        let tempParamString = '';
        if (pfPassphrase !== null) {
            pfParamString += `&passphrase=${encodeURIComponent(pfPassphrase.trim()).replace(/%20/g, "+")}`;
        }

        const signature = crypto.createHash("md5").update(pfParamString).digest("hex");
        return pfData['signature'] === signature;
    };

    async function ipLookup(domain) {
        return new Promise((resolve, reject) => {
            dns.lookup(domain, { all: true }, (err, address, family) => {
                if (err) {
                    reject(err)
                } else {
                    const addressIps = address.map(function (item) {
                        return item.address;
                    });
                    resolve(addressIps);
                }
            });
        });
    }

    const pfValidIP = async (req) => {
        const validHosts = [
            'www.payfast.co.za',
            'sandbox.payfast.co.za',
            'w1w.payfast.co.za',
            'w2w.payfast.co.za'
        ];

        let validIps = [];
        const pfIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        try {
            for (let key in validHosts) {
                const ips = await ipLookup(validHosts[key]);
                validIps = [...validIps, ...ips];
            }
        } catch (err) {
            console.error(err);
        }

        const uniqueIps = [...new Set(validIps)];

        if (uniqueIps.includes(pfIp)) {
            return true;
        }
        return false;
    };

    const pfValidPaymentData = (cartTotal, pfData) => {
        return Math.abs(parseFloat(cartTotal) - parseFloat(pfData['amount_gross'])) <= 0.01;
    };

    const pfValidServerConfirmation = async (pfHost, pfParamString) => {
        const result = await axios.post(`https://${pfHost}/eng/query/validate`, pfParamString)
            .then((res) => {
                return res.data;
            })
            .catch((error) => {
                console.error(error)
            });
        return result === 'VALID';
    };

    const check1 = pfValidSignature(pfData, pfParamString, passPhrase);
    const check2 = pfValidIP(req);
    const check3 = pfValidPaymentData(5000, pfData);
    const check4 = pfValidServerConfirmation(pfHost, pfParamString);

    if (check1 && check2 && check3 && check4) {
        console.log("Payment was successfully");
    } else {
        console.log("Payment was not successfully")
    }

});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});