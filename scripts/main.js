const convertInput = document.getElementById("convert-input");
const convertSettings = document.getElementById("convert-settings");
const convertOutput = document.getElementById("convert-output");


convertInput.addEventListener("input", (e) => {
  let input = e.target.value;
  console.log(input);

  let B1 = parseB1(input);
  let B0 = null;
  let RC = null;
  let AC123 = null;

  if (B1 !== null) {
    console.log("B1 Detected");
    console.log(B1);
    B0 = calcB1toB0(B1);
    RC = calcB0toRC(B0);
  } else {
    B0 = parseB0(input);
    if (B0 !== null) {
      console.log("B0 Detected");
      console.log(B0);
      RC = calcB0toRC(B0);
    } else {
      RC = parseRC(input);
      if (RC !== null) {
        console.log("RC Detected");
        console.log(RC);
        B0 = calcRCtoB0(RC);
      } else {
        console.log("Unknown Detected");
        convertOutput.innerText = "";
        return;
      }
    }
  }

  let spacesSetting = true; // TODO: use setting
  AC123 = calcRCtoAC123(RC);
  if (AC123 !== null) {
    console.log("Valid AC123 Detected");
    convertOutput.innerText = stringifyB0(B0, spacesSetting) + RC + AC123;
  } else {
    convertOutput.innerText = stringifyB0(B0, spacesSetting) + RC;
  }
});


function parseB1(input) {
  let inputArray = input.toUpperCase().split(" ");
  // console.log(inputArray);
  
  if (inputArray.length < 6) return null;
  if (inputArray[0] !== "AA") return null; // Sync init
  if (inputArray[1] !== "B1") return null; // Command
  if (inputArray[inputArray.length - 1] !== "55") return null; // Sync End
  
  let numBuckets = parseInt(inputArray[2], 16);
  if (Number.isNaN(numBuckets)) return null;
  if (inputArray.length < (5 + numBuckets)) return null; // Length doesn't match number of buckets
  
  let bucketsHex = inputArray.slice(3, 3 + numBuckets);
  let buckets = [];
  for (let bucketHex of bucketsHex) {
    let bucket = parseInt(bucketHex, 16);
    if (Number.isNaN(bucket)) return null;
    buckets.push(bucket);
  }
  
  let code = inputArray[inputArray.length - 2];
  if (isNaN(parseInt(code, 16))) return null; // Is hex string?
  
  return [buckets, code];
}

function parseB0(input) {
  let inputArray = input.toUpperCase().split(" ");
  if (inputArray.length < 8) return null;
  if (inputArray[0] !== "AA") return null; // Sync init
  if (inputArray[1] !== "B0") return null; // Command
  if (inputArray[inputArray.length - 1] !== "55") return null; // Sync End

  let dataLength = parseInt(inputArray[2], 16); // Length of the rest of just the data
  if (Number.isNaN(dataLength)) return null;
  let calculatedLength = input.replaceAll(" ", "").length / 2 - 4;
  if (dataLength !== calculatedLength) return null; // Length doesn't match specified length

  let numBuckets = parseInt(inputArray[3], 16);
  if (Number.isNaN(numBuckets)) return null;
  if (inputArray.length < (7 + numBuckets)) return null; // Length doesn't match number of buckets

  let numRepeats = parseInt(inputArray[4], 16);
  if (Number.isNaN(numRepeats) || numRepeats < 1) return null;

  let bucketsHex = inputArray.slice(5, 5 + numBuckets);
  let buckets = [];
  for (let bucketHex of bucketsHex) {
    let bucket = parseInt(bucketHex, 16);
    if (Number.isNaN(bucket)) return null;
    buckets.push(bucket);
  }

  let code = inputArray[inputArray.length - 2];
  if (isNaN(parseInt(code, 16))) return null; // Is hex string?

  return [dataLength, numRepeats, buckets, code];
}

function parseRC(input) {
  let inputSplit = input.match(/^{(.*?), ({.*})*, {(.*?)}, {(.*?)}}, (.*)$/);
  // console.log(inputSplit);
  if (inputSplit === null || inputSplit.length !== 6) return null;
  let code = inputSplit[5];
  if (isNaN(parseInt(code, 2))) return null; // Is binary string?

  let commonDivisor = parseInt(inputSplit[1]);
  if (Number.isNaN(commonDivisor) || commonDivisor < 1) return null;

  // let syncBitsRaw = inputSplit[2].split(/[, {}]+/);
  let syncBitsRaw = inputSplit[2].match(/[\w]+/g);
  // console.log(syncBitsRaw);
  if (syncBitsRaw === null || syncBitsRaw.length % 2 !== 0) return null; // Is groups of two?
  let syncBits = [];
  for (let i = 0; i < syncBitsRaw.length; i += 2) {
    let syncBitA = parseInt(syncBitsRaw[i]);
    if (Number.isNaN(syncBitA)) return null;
    let syncBitB = parseInt(syncBitsRaw[i + 1]);
    if (Number.isNaN(syncBitB)) return null;
    syncBits.push([syncBitA, syncBitB]);
  }

  let bit0Raw = inputSplit[3].split(", ");
  if (bit0Raw.length !== 2) return null;
  let bit0A = parseInt(bit0Raw[0]);
  if (Number.isNaN(bit0A)) return null;
  let bit0B = parseInt(bit0Raw[1]);
  if (Number.isNaN(bit0B)) return null;
  let bit0 = [bit0A, bit0B];

  let bit1Raw = inputSplit[4].split(", ");
  if (bit0Raw.length !== 2) return null;
  let bit1A = parseInt(bit1Raw[0]);
  if (Number.isNaN(bit1A)) return null;
  let bit1B = parseInt(bit1Raw[1]);
  if (Number.isNaN(bit1B)) return null;
  let bit1 = [bit1A, bit1B];

  let timingData = [commonDivisor, syncBits, bit0, bit1];

  return [timingData, code];
}


function calcB1toB0(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;

  let numRepeatsSetting = 8; // TODO: use setting
  let numRepeats = numRepeatsSetting;

  let buckets = input[0];

  let code = input[1];

  let dataLength = 1 + 1 + 2 * buckets.length + code.length / 2; // Number of bytes in numBuckets + numRepeats + buckets + code

  let B0 = [dataLength, numRepeats, buckets, code];
  // console.log(B0);

  return B0;
}

function calcB0toRC(input) {

}

function calcRCtoB0(input) {

}

function calcRCtoAC123(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;
  let code = input[1]
  if (code.length % 8 !== 0) return null;
  if (code.length / 8 !== 8) return null;
  let AC123 = code.match(/[01]{8}/g);
  // console.log(AC123);
  return AC123;
}


function stringifyB0(input, spaces = true) {
  if (!Array.isArray(input) || input.length !== 4) return null;

  let syncInit = "AA";
  let command = "B0";
  let dataLength = input[0].toString(16).padStart(2, "0");
  let numBuckets = input[2].length.toString(16).padStart(2, "0");
  let numRepeats = input[1].toString(16).padStart(2, "0");

  let bucketsArray = input[2].map((x) => x.toString(16).padStart(4, "0"));
  let buckets;
  if (spaces) {
    buckets = bucketsArray.join(" ");
  } else {
    buckets = bucketsArray.join("");
  }

  let code = input[3];

  let syncEnd = "55";

  let B0 = [syncInit, command, dataLength, numBuckets, numRepeats, buckets, code, syncEnd];
  // console.log(B0);

  if (spaces) {
    return B0.join(" ").toUpperCase();
  } else {
    return B0.join("").toUpperCase();
  }
}
