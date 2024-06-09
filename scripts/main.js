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
  let inputClean = input.toUpperCase().replaceAll(" ", "");
  // console.log(inputClean);

  if (inputClean.length < 14) return null; // Shortest possible input
  if (inputClean.substr(0, 4) !== "AAB1") return null; // Sync init & Command
  if (inputClean.substr(-2, 2) !== "55") return null; // Sync End

  let numBuckets = parseInt(inputClean.substr(4, 2), 16);
  if (Number.isNaN(numBuckets)) return null;
  if (inputClean.length < (10 + 4 * numBuckets)) return null; // Length doesn't match number of buckets

  let buckets = [];
  for (let i = 0; i < numBuckets; i++) {
    let bucket = parseInt(inputClean.substr(6 + 4 * i, 4), 16);
    if (Number.isNaN(bucket)) return null;
    buckets.push(bucket);
  }

  let dataIndex = 6 + 4 * numBuckets;
  let data = inputClean.substring(dataIndex, inputClean.length - 2);
  if (isNaN(parseInt(data, 16))) return null; // Is hex string?

  return [buckets, data];
}

function parseB0(input) {
  let inputClean = input.toUpperCase().replaceAll(" ", "");
  // console.log(inputClean);

  if (inputClean.length < 18) return null; // Shortest possible input
  if (inputClean.substr(0, 4) !== "AAB0") return null; // Sync init & Command
  if (inputClean.substr(-2, 2) !== "55") return null; // Sync End

  let dataLength = parseInt(inputClean.substr(4, 2), 16); // Length of the rest of just the data
  if (Number.isNaN(dataLength)) return null;
  let calculatedLength = inputClean.length / 2 - 4;
  if (dataLength !== calculatedLength) return null; // Length doesn't match specified length

  let numBuckets = parseInt(inputClean.substr(6, 2), 16);
  if (Number.isNaN(numBuckets)) return null;
  if (inputClean.length < (14 + 4 * numBuckets)) return null; // Length doesn't match number of buckets

  let numRepeats = parseInt(inputClean.substr(8, 2), 16);
  if (Number.isNaN(numRepeats) || numRepeats < 1) return null;

  let buckets = [];
  for (let i = 0; i < numBuckets; i++) {
    let bucket = parseInt(inputClean.substr(10 + 4 * i, 4), 16);
    if (Number.isNaN(bucket)) return null;
    buckets.push(bucket);
  }

  let dataIndex = 10 + 4 * numBuckets;
  let data = inputClean.substring(dataIndex, inputClean.length - 2);
  if (isNaN(parseInt(data, 16))) return null; // Is hex string?

  return [dataLength, numRepeats, buckets, data];
}

function parseRC(input) {
  let inputSplit = input.match(/^{(.*?), ?({.*})*, ?{(.*?)}, ?{(.*?)}}, ?(.*)$/);
  // console.log(inputSplit);
  if (inputSplit === null || inputSplit.length !== 6) return null;
  let data = inputSplit[5];
  if (isNaN(parseInt(data, 2))) return null; // Is binary string?

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

  return [timingData, data];
}


function calcB1toB0(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;

  let numRepeatsSetting = 8; // TODO: use setting
  let numRepeats = numRepeatsSetting;

  let buckets = input[0];

  let data = input[1];

  let dataLength = 1 + 1 + 2 * buckets.length + data.length / 2; // Number of bytes in numBuckets + numRepeats + buckets + data

  return [dataLength, numRepeats, buckets, data];
}

function calcB0toRC(input) {
  /*
  	B0 format:
    Each bit of the code is represented by a combination of a high then a low RF signal with different timings indicating either a 1 or a 0.
    The protocol starts with a sync code of a few bits with unique timings to indicate the start.
    The full thing is usually repeated multiple times.
    	
    The buckets store the unique timings between highs and lows in the RF signal for a protocol
    
  	Each bit of code is represented by 2 bytes of the data in B0, each of which is split into 2 parts:
    	The leftmost bit is whether the signal should be high or low.
    	The other 7 bits are an index into the bucket array for the time that signal is held.
    
    The protocol sync code can sometimes be read starting from the second (posibly third?) sync byte, meaning the first ends up at the end.
    Maybe do full detection of this from: https://github.com/Portisch/RF-Bridge-EFM8BB1/blob/af1bddb3d81c79d67063184219ec21f8249dffd0/BitBucketConverter.py#L159
  */
  if (!Array.isArray(input) || input.length !== 4) return null;

  let buckets = input[2];
  let data = input[3];

  let startHigh = parseInt(data[0], 16) >>> 3;
  let bucketIndices = [];
  for (let i = 0; i < data.length; i++) {
    bucketIndices.push(parseInt(data[i], 16) & 7);
  }

  let numSyncBitsSetting = 2; // Maybe become setting, not sure all the effects changing this has?
  let numSyncIndices = numSyncBitsSetting * 2;

  let syncIndices;
  let codeIndices;
  if (startHigh) {
    syncIndices = bucketIndices.slice(0, numSyncIndices);
    codeIndices = bucketIndices.slice(numSyncIndices);
  } else {
    syncIndices = bucketIndices.slice(0, numSyncIndices-1)
    syncIndices.unshift(bucketIndices[bucketIndices.length - 1]);
    codeIndices = bucketIndices.slice(numSyncIndices-1, -1);
  }

  let bit1Mask = codeIndices.slice(0, 2);
  if (buckets[codeIndices[0]] < buckets[codeIndices[1]]) {
    bit1Mask.reverse();
  }

  let customDivisorSetting = null; // Make into setting
  let greatestDivisor = customDivisorSetting;
  if (greatestDivisor === null) {
    greatestDivisor = buckets.reduce(gcd);
  }
  let timingMultiples = buckets.map((x) => x / greatestDivisor);

  let timingData = [greatestDivisor];
  let syncMultiples = [];
  for (let i = 0; i < syncIndices.length; i += 2) {
    syncMultiples.push([timingMultiples[syncIndices[i]], timingMultiples[syncIndices[i + 1]]]);
  }
  timingData.push(syncMultiples);
  timingData.push([timingMultiples[bit1Mask[1]], timingMultiples[bit1Mask[0]]]);
  timingData.push([timingMultiples[bit1Mask[0]], timingMultiples[bit1Mask[1]]]);


  let code = "";
  for (let i = 0; i < codeIndices.length; i += 2) {
    code += (codeIndices[i] === bit1Mask[0]) ? "1" : "0";
  }

  return [timingData, code];
}

function calcRCtoB0(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;
  
  let timingData = input[0];
  let code = input[1];
  
  let timingDivisor = timingData[0];
  let syncMultiples = timingData[1].flat();
  let bit1Multiples = timingData[3];
  
  let timingMultiplesUnique = [...new Set(timingData.slice(1).flat(2))];
  let timingBuckets = timingMultiplesUnique.map((x) => x *timingDivisor);
  
  let syncIndices = syncMultiples.map((x) => timingMultiplesUnique.indexOf(x));
  let bit1Indices = bit1Multiples.map((x) => timingMultiplesUnique.indexOf(x));
  let bitIndices = [bit1Indices.toReversed(), bit1Indices];
  
  let codeIndices = [];
  for (let i = 0; i < code.length; i++) {
  	codeIndices = codeIndices.concat(bitIndices[code[i]]);
  }
  
  let dataIndices = syncIndices.concat(codeIndices);
  
  let data = "";
  for (let i = 0; i < dataIndices.length; i++) {
  	let dataByte = (((i+1)%2) << 3) + dataIndices[i];
    data += dataByte.toString(16);
  }
  
  let dataLength = 1 + 1 + 2 * timingBuckets.length + data.length / 2; // Number of bytes in numBuckets + numRepeats + buckets + data
  
  let numRepeatsSetting = 8; // TODO: use setting
  let numRepeats = numRepeatsSetting;
  
  return [dataLength, numRepeats, timingBuckets, data];
}

function calcRCtoAC123(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;
  let data = input[1]
  if (data.length % 8 !== 0) return null;
  if (data.length / 8 !== 8) return null;
  let AC123 = data.match(/[01]{8}/g);
  // console.log(AC123);
  return AC123;
}


function stringifyB0(input, spaces = true) {
  if (!Array.isArray(input) || input.length !== 4) return null;

  let joinChar;
  if (spaces) {
    joinChar = " ";
  } else {
    joinChar = "";
  }

  let syncInit = "AA";
  let command = "B0";
  let dataLength = input[0].toString(16).padStart(2, "0");
  let numBuckets = input[2].length.toString(16).padStart(2, "0");
  let numRepeats = input[1].toString(16).padStart(2, "0");

  let bucketsArray = input[2].map((x) => x.toString(16).padStart(4, "0"));
  let buckets = bucketsArray.join(joinChar);

  let data = input[3];

  let syncEnd = "55";

  let B0 = [syncInit, command, dataLength, numBuckets, numRepeats, buckets, data, syncEnd];
  // console.log(B0);

  return B0.join(joinChar).toUpperCase();
}

function stringifyRC(input) {

}

function stringifyAC123(input) {

}


function gcd(a, b) {
  if (b === 0) {
    return a;
  }
  return gcd(b, a % b);
}
