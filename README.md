# LCDM-1000T_Manager
Communicate with Cash Dispenser LCDM-1000T


usege :

```
const DispenserManager = require ('./dispenser');

let dispenser = new DispenserManager("/dev/ttyS0");

dispenser.purge().then(purgeAnswer => {
    console.log("purge answer is ->> ", purgeAnswer);
    dispenser.dispense("1").then(withdrawAnswer => {
        console.log("withdraw answer is ->> ", withdrawAnswer);
    })
})
```
