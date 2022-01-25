import numeral from "numeral";
import Web3 from "web3";

/** 
 * convert crypto `value`(ethereum coin or token) to wei depends on `decimals` amount (default 18)
 * ```
 * const { currency } = useAccount()
 * currencyValueToWei(value, currency.decimals)
 * ```
*/
export const currencyValueToWei = (
  value: number | string,
  decimals?: number
): string => {
  if (value?.toString() && decimals) {
    const val = value.toString();
    let [whole, fraction] = val.split(".");
    if (!whole) whole = "0";
    if (!fraction) fraction = "0";
    while (fraction.length < decimals) fraction += "0";
    const { toBN } = Web3.utils;
    const wei = toBN(whole)
      .mul(toBN(+`1e${decimals}`))
      .add(toBN(fraction));
    return toBN(wei?.toString())?.toString();
  }
  return Web3.utils.toWei(value?.toString() || "0", "ether");
};


/** 
 * wei `value` to crypto (ethereum coin or token) depends on `decimals` amount (default 18)
*/
export const weiToCurrencyValue = (
  value: number | string,
  decimals?: number
): string => {
  if (!decimals) return Web3.utils.fromWei(`${value}`, "ether");
  const { toBN } = Web3.utils;
  const wei = toBN(value);
  const base = toBN(+`1e${decimals}`);
  let fraction = wei.mod(base)?.toString(10);
  while (fraction.length < decimals) fraction = "0" + fraction;
  return `${wei.div(base)?.toString()}${
    fraction === "0" ? "" : "." + fraction
  }`;
};

/** 
 * format currency value to readable format
 * ```
 * formatCurrencyValue(value, '0,0.[00000]' )
 * ``` 
*/
export const formatCurrencyValue = (
  value: number | string,
  format?: string // '0,0.0[00000]'
): string => {
  if (!format) {
    const val = typeof value === "number" ? value : parseFloat(value);
    const precision =
      val > 0 ? Math.max(0, Math.log(val) / Math.LN10 + 1 + 1e-15) : 0;
    if (precision < 6) format = `0,0.0[${"0".repeat(6 - precision)}]`;
    else format = "0,0";
  }
  const formattedEther = numeral(value).format(format);
  if (formattedEther === "NaN") return `${value}`;
  return formattedEther;
};

const ethereum = {
  weiToCurrencyValue,
  currencyValueToWei,
  formatCurrencyValue,
};

export default ethereum;
