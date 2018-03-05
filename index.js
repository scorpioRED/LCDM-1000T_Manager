let SerialPort = require("serialport");

class DispenserManager {
    constructor(path) {
        this.status = " --- not set -----";
        this.port = new SerialPort(path, {
            baudRate: 9600,
            dataBit: 8,
            autoOpen: false
        });

        this.port.open((err) => {
            if (err) {
                return console.log("Error opening port: ", err.message);
            }

        });




    }


    _cmdMap(code) {
        let cmds = {
            "44": "purge",
            "45": "dispense",
            "46": "status",
            "47": "rom version",
            "76": "test dispense"

        };

        return cmds[code]
    }

    _errorMap(code) {
        let errors = {
            "30": "good",
            "31": "normal stop",
            "32": "picup error",
            "33": "jam at CHK 1,2 Sensor",
            "34": "overflow bill",
            "35": "jam at EXIT Sensor or EJT Sensor",
            "36": "jam at DIV Sensor",
            "37": "undefined command",
            "38": "bill end",
            "3b": "note request error",
            "3c": "counting error (betwen Div and EJT sensors)",
            "3d": "counting error (betwen EJT and EXIT sensors)",
            "3f": "reject tray is not recognized",
            "41": "motor stop",
            "42": "jam at div sensor",
            "43": "timeout",
            "44": "over reject",
            "45": "casete is not recognized",
            "47": "dispensing timeout",
            "49": "diverte solenoid or SOL sensor error",
            "4a": "SOL sensor error",
            "4e": "purge error (jam at Div Sensor)",

        };

        return code + " / " + errors[code];
    }


    _billQountity(dec) {
        dec = String(dec);
        return "0x" + dec.charCodeAt(0).toString(16); // return hex;
    }

    _xorVerificatedNumber(prefixWithCmd) { // ['0x04','0x50','0x02','0x76','0x03'] exeple of argument
        return prefixWithCmd.join('').replace(/0x/g, "") + prefixWithCmd.reduce((a, b) => a ^ b).toString(16) // return in hex
    }

    _responseParser(response, cmdTitle) {
        let asciiToDecStr = (val) => {
            return String(val).split('')[1];
        }

        response = response.match(/.{2}/g);
        let parsedResponse = {
            soh: response[0],
            id: response[1],
            stx: response[2],
            cmd: this._cmdMap(response[3])

        }

        if (response[3] == "45") { // if deposit
            parsedResponse.firstSensorBills = asciiToDecStr(response[4]) + asciiToDecStr(response[5])

            parsedResponse.dispenseQountity = asciiToDecStr(response[6]) + asciiToDecStr(response[7])

            parsedResponse.error = this._errorMap(response[8])

            parsedResponse.cassetteStatus = String(response[9]) == "30" ? "normal" : "near end"
            parsedResponse.rejectedBills = asciiToDecStr(response[10]) + asciiToDecStr(response[11])
            parsedResponse.ext = response[12]
            parsedResponse.bcc = response[13]
        }

        if (response[3] == "44") { // if purge
            parsedResponse.error = this._errorMap(response[4])
            parsedResponse.ext = response[5]
            parsedResponse.bcc = response[6]
        }

        if (response[3] == "46") { // if status

            parsedResponse.someElse = response[4]
            parsedResponse.error = this._errorMap(response[5])

            parsedResponse.sensorO = this._errorMap(response[6])
            parsedResponse.sensorI = response[7]

            parsedResponse.ext = response[8]
            parsedResponse.bcc = response[9]
        }


        return parsedResponse;

    }

    _onRecivedData(data) { // now not using
        console.log(counter, " in class Data: ", data, data.toString("hex"));
    }

    _runCMD (cmd) {
        let self = this;
        let counter = 0;
        let response = "";
        let emiters;
        return new Promise((resolve, reject) => {
            self.port.write(cmd);
            self.port.on("data", (data) => {
                counter++;
                // console.log(counter,' in class Data: ',data);
                response = counter > 1 && counter < 4 ? response + data.toString("hex") : "";
                if (counter == 3) {
                    // console.log("send ACK answer for response");
                    self.port.write(Buffer.from("06", "hex")); // send ACK answer for response

                    let toResolve = self._responseParser(response);
                    counter = 0;
                    self.port.removeAllListeners(["data"]);
                    resolve(toResolve);
                }

            })
        })
    }

    purge() {
        let dataToSend = Buffer.from("045002440311", "hex");
        return this._runCMD(dataToSend);
    }

    dispense(quontity) {
        if (quontity.length < 2) quontity = "0" + quontity;
        let dataToSend = Buffer.from(this._xorVerificatedNumber(['0x04', '0x50', '0x02', '0x45', this._billQountity(quontity[0]), this._billQountity(quontity[1]), "0x03"]), "hex");
        return this._runCMD(dataToSend);
    }



}


module.exports = DispenserManager