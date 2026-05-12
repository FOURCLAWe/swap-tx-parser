const form = document.querySelector("#analyze-form");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const resultEl = document.querySelector("#result");
const copyRowTemplate = document.querySelector("#copy-row-template");
const submitButton = form.querySelector("button[type='submit']");
const formStatus = document.querySelector("#form-status");
const probeForm = document.querySelector("#probe-form");
const probeSubmitButton = probeForm.querySelector("button[type='submit']");
const probeStatus = document.querySelector("#probe-status");
const txLabel = document.querySelector("#tx-label");
const amountLabel = document.querySelector("#amount-label");
const tradeAmountInput = document.querySelector("#trade-amount");
const modeNote = document.querySelector("#mode-note");
const emptyCopy = document.querySelector("#empty-copy");
const connectWalletButton = document.querySelector("#connect-wallet");
const walletStateEl = document.querySelector("#wallet-state");
const sendToInput = document.querySelector("#send-to");
const sendValueInput = document.querySelector("#send-value");
const sendDataInput = document.querySelector("#send-data");
const sendTransactionButton = document.querySelector("#send-transaction");
const senderStatus = document.querySelector("#sender-status");
const senderQueueEl = document.querySelector("#sender-queue");
const senderStepsEl = document.querySelector("#sender-steps");
const approveTokenInput = document.querySelector("#approve-token");
const approveSpenderInput = document.querySelector("#approve-spender");
const approveAmountInput = document.querySelector("#approve-amount");
const approveDecimalsInput = document.querySelector("#approve-decimals");
const approveMaxInput = document.querySelector("#approve-max");
const buildApprovalButton = document.querySelector("#build-approval");
const toolNavButtons = [...document.querySelectorAll("[data-tool-target]")];
const toolPanels = [...document.querySelectorAll("[data-tool-panel]")];

const txRegex = /0x[a-fA-F0-9]{64}/;
const addressRegex = /0x[a-fA-F0-9]{40}/;
const defaultEthRpcUrl = "https://ethereum-rpc.publicnode.com";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const zeroAddress = "0x0000000000000000000000000000000000000000";
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const v4PoolManagerAddress = "0x000000000004444c5dc75cb358380d2e3de08a90";
const permit2Address = "0x000000000022d473030f116ddee9f6b43ac78ba3";
const universalRouterAddress = "0x66a9893cc07d91d95644aedd05d03f95e1dba8af";
const universalRouter211Address = "0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca";
const slippageDenominator = 10000n;
const maxUint256 = 2n ** 256n - 1n;
const knownMethods = {
  "0x077587dd": "V4 hook/router custom ETH buy",
  "0x286d4c33": "V4 hook/router custom token sell",
  "0x7ff36ab5": "Uniswap V2 swapExactETHForTokens",
  "0xb6f9de95": "Uniswap V2 swapExactETHForTokensSupportingFeeOnTransferTokens",
  "0x18cbafe5": "Uniswap V2 swapExactTokensForETH",
  "0x791ac947": "Uniswap V2 swapExactTokensForETHSupportingFeeOnTransferTokens",
  "0x38ed1739": "Uniswap V2 swapExactTokensForTokens",
  "0x5c11d795": "Uniswap V2 swapExactTokensForTokensSupportingFeeOnTransferTokens",
  "0xd96a094a": "Bonding-curve buy(uint256 minAmountOut)",
  "0xd79875eb": "Bonding-curve sell(uint256 amountIn,uint256 minEthOut)",
  "0x24856bc3": "Uniswap Universal Router execute(bytes,bytes[])",
  "0x3593564c": "Uniswap Universal Router execute(bytes,bytes[],uint256)",
  "0x414bf389": "Uniswap V3 exactInputSingle",
  "0x04e45aaf": "Uniswap V3 exactInputSingle",
  "0xc04b8d59": "Uniswap V3 exactInput",
  "0xb858183f": "Uniswap V3 exactInput",
  "0xeffbec13": "V4 hook/router swap(tuple[],address,uint256,uint256,uint256)",
  "0xb2703a63": "V4 hook/router token sell",
  "0x08c1284c": "Aggregator packed sell"
};
let connectedAccount = "";
let activeProvider = null;
let activeProviderName = "";
let senderSteps = [];
let activeSenderStepIndex = -1;
const announcedProviders = [];

window.addEventListener("eip6963:announceProvider", (event) => {
  const detail = event.detail || {};
  if (detail.provider?.request && !announcedProviders.some((item) => item.provider === detail.provider)) {
    announcedProviders.push(detail);
  }
});

window.dispatchEvent(new Event("eip6963:requestProvider"));

function extractTxHash(value) {
  const match = String(value || "").match(txRegex);
  return match ? match[0] : "";
}

function extractAddress(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(addressRegex);
  return match ? match[0] : "";
}

function setFormStatus(message, state = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status ${state}`.trim();
}

function setProbeStatus(message, state = "") {
  probeStatus.textContent = message;
  probeStatus.className = `form-status ${state}`.trim();
}

function setSenderStatus(message, state = "") {
  senderStatus.textContent = message;
  senderStatus.className = `form-status ${state}`.trim();
}

function setView(view) {
  emptyState.hidden = view !== "empty";
  loadingState.hidden = view !== "loading";
  resultEl.hidden = view !== "result";
}

function showToolPanel(name, options = {}) {
  for (const panel of toolPanels) {
    panel.hidden = panel.dataset.toolPanel !== name;
  }
  for (const button of toolNavButtons) {
    const active = button.dataset.toolTarget === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  }
  if (options.scroll) {
    document.querySelector(".tool-nav")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getTradeType() {
  return form.querySelector("input[name='tradeType']:checked")?.value === "sell" ? "sell" : "buy";
}

function updateModeCopy() {
  const tradeType = getTradeType();
  const isSell = tradeType === "sell";
  txLabel.textContent = isSell ? "成功卖出 tx" : "成功买入 tx";
  amountLabel.textContent = isSell ? "卖出代币数量" : "买入 ETH 数量";
  tradeAmountInput.placeholder = isSell ? "74" : "0.05";
  modeNote.textContent = isSell
    ? "按滑点重算最小输出；勾强制成交会把 minOut 设为 0。"
    : "按滑点重算最小输出；价格涨太快就调大滑点。";
  emptyCopy.textContent = isSell
    ? "输入一笔已经成功卖出的 Ethereum 交易，工具会解析卖出路径。"
    : "输入一笔已经成功买入的 Ethereum 交易，工具会解析购买路径。";
  setFormStatus(isSell ? "准备好了，粘完整卖出 tx 后点按钮。" : "准备好了，粘完整买入 tx 后点按钮。");
  setView("empty");
  resultEl.innerHTML = "";
}

function isOkxProvider(provider, info = {}) {
  const name = String(info.name || provider?.name || "").toLowerCase();
  const rdns = String(info.rdns || provider?.rdns || "").toLowerCase();
  return Boolean(
    provider?.isOkxWallet ||
      provider?.isOKExWallet ||
      name.includes("okx") ||
      rdns.includes("okx") ||
      provider === window.okxwallet ||
      provider === window.okxwallet?.ethereum
  );
}

function getProviderName(provider, info = {}) {
  if (isOkxProvider(provider, info)) return "OKX Wallet";
  if (provider?.isMetaMask) return "MetaMask";
  if (info.name) return info.name;
  return "Injected Wallet";
}

function getInjectedProviders() {
  const providers = [];
  const addProvider = (provider, info = {}) => {
    if (provider?.request && !providers.some((item) => item.provider === provider)) {
      providers.push({ provider, info });
    }
  };

  addProvider(window.okxwallet, { name: "OKX Wallet", rdns: "com.okx.wallet" });
  addProvider(window.okxwallet?.ethereum, { name: "OKX Wallet", rdns: "com.okx.wallet" });
  for (const item of announcedProviders) addProvider(item.provider, item.info || {});
  for (const provider of window.ethereum?.providers || []) addProvider(provider);
  addProvider(window.ethereum);

  return providers;
}

function getProvider() {
  if (activeProvider?.request) return activeProvider;
  const providers = getInjectedProviders();
  const okx = providers.find((item) => isOkxProvider(item.provider, item.info));
  const selected = okx || providers[0] || null;
  activeProvider = selected?.provider || null;
  activeProviderName = selected ? getProviderName(selected.provider, selected.info) : "";
  return activeProvider;
}

function updateWalletState(account, chainId = "") {
  connectedAccount = account ? normalizeAddress(account) : "";
  if (!connectedAccount) {
    walletStateEl.textContent = "未连接钱包";
    connectWalletButton.textContent = "连接";
    return;
  }
  const walletName = activeProviderName || "Wallet";
  walletStateEl.textContent = `${walletName}: ${shortAddress(connectedAccount)} / ${chainId === "0x1" ? "Ethereum" : chainId || "未知网络"}`;
  connectWalletButton.textContent = "已连接";
  const walletInput = document.querySelector("#buyer-address");
  if (walletInput && !walletInput.value.trim()) walletInput.value = connectedAccount;
}

async function switchToMainnet(provider) {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId === "0x1") return chainId;
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x1" }]
  });
  return "0x1";
}

async function connectWallet() {
  const provider = getProvider();
  if (!provider) {
    setSenderStatus("没有检测到浏览器钱包，请安装或打开 OKX Wallet。", "error");
    return "";
  }

  connectWalletButton.disabled = true;
  connectWalletButton.textContent = "连接中";
  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const chainId = await switchToMainnet(provider);
    const account = accounts?.[0] || "";
    updateWalletState(account, chainId);
    setSenderStatus(`${activeProviderName || "钱包"} 已连接，发送前会弹出钱包确认。`, "ok");
    return account;
  } catch (err) {
    setSenderStatus(err instanceof Error ? err.message : String(err), "error");
    return "";
  } finally {
    connectWalletButton.disabled = false;
    if (!connectedAccount) connectWalletButton.textContent = "连接";
  }
}

function normalizeTxData(value) {
  const clean = strip0x(String(value || "").trim());
  if (!clean) return "0x";
  if (!/^[a-fA-F0-9]+$/.test(clean)) throw new Error("Data 必须是 0x 开头的十六进制");
  if (clean.length % 2 !== 0) throw new Error("Data 十六进制长度必须是偶数");
  return `0x${clean.toLowerCase()}`;
}

function decimalEthToHex(value) {
  const wei = parseDecimalToUnits(String(value || "0").trim() || "0", 18) ?? 0n;
  return `0x${wei.toString(16)}`;
}

function formatSenderStepLabel(index) {
  const step = senderSteps[index];
  return step ? `${index + 1}. ${step.label}` : "交易";
}

function renderSenderSteps() {
  if (!senderQueueEl || !senderStepsEl) return;
  senderStepsEl.innerHTML = "";
  senderQueueEl.hidden = senderSteps.length === 0;

  senderSteps.forEach((step, index) => {
    const button = document.createElement("button");
    button.className = `step-btn ${index === activeSenderStepIndex ? "active" : ""} ${step.sent ? "sent" : ""}`.trim();
    button.type = "button";
    button.textContent = `${index + 1}. ${step.label}${step.sent ? " / 已发" : ""}`;
    button.addEventListener("click", () => fillSender(step.tx, formatSenderStepLabel(index)));
    senderStepsEl.append(button);
  });
}

function clearSenderQueue() {
  senderSteps = [];
  activeSenderStepIndex = -1;
  renderSenderSteps();
}

function findSenderStepIndex(txPayload) {
  return senderSteps.findIndex((step) => step.tx === txPayload);
}

function setSenderQueue(steps, options = {}) {
  senderSteps = steps.filter((step) => step?.tx?.to && step?.tx?.data);
  activeSenderStepIndex = -1;
  renderSenderSteps();

  if (options.autoFill !== false && senderSteps[0]) {
    const firstLabel = formatSenderStepLabel(0);
    const status =
      senderSteps.length > 1
        ? "已自动填入授权 approve 的 To 和 Data。金额框不会自动填；授权上链后，再点步骤 2 填入卖出 swap。"
        : `${firstLabel} 已自动填入 To 和 Data，金额框请手动填写。`;
    fillSender(senderSteps[0].tx, firstLabel, { scroll: false, status, showSender: false });
  }
}

function fillSender(txPayload, label = "交易", options = {}) {
  if (!txPayload) return;
  sendToInput.value = txPayload.to || "";
  sendValueInput.value = "";
  sendDataInput.value = txPayload.data || "0x";
  const stepIndex = findSenderStepIndex(txPayload);
  if (stepIndex >= 0) {
    activeSenderStepIndex = stepIndex;
    renderSenderSteps();
  }
  if (options.showSender !== false) showToolPanel("sender", { scroll: options.scroll !== false });
  setSenderStatus(options.status || `${label} 已填入 To 和 Data，金额框请手动填写。`, "ok");
  if (options.scroll !== false) {
    sendToInput.focus();
  }
}

function buildManualApproval() {
  try {
    const token = extractAddress(approveTokenInput.value);
    const spender = extractAddress(approveSpenderInput.value);
    if (!token) throw new Error("Token 合约地址不完整");
    if (!spender) throw new Error("Spender / 路由地址不完整");

    const decimals = parseDecimals(approveDecimalsInput.value);
    const amountRaw = approveMaxInput.checked
      ? maxUint256
      : parseDecimalToUnits(approveAmountInput.value, decimals);
    if (amountRaw == null) throw new Error("请填写授权数量，或者勾选最大授权");

    const approveTx = buildApproveTransaction(token, spender, amountRaw, {
      decimals,
      symbol: approveMaxInput.checked ? "MAX" : "TOKEN"
    });
    clearSenderQueue();
    fillSender(approveTx, "授权 approve");
  } catch (err) {
    setSenderStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

function showLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "解析中..." : "解析并生成";
  setView(isLoading ? "loading" : "result");
  if (isLoading) {
    clearSenderQueue();
    setFormStatus("正在读取链上交易，慢的话 15 秒会自动超时。");
  }
}

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function normalizeAddress(value) {
  return `0x${strip0x(value).toLowerCase()}`;
}

function normalizeHex(value) {
  const clean = strip0x(value);
  return `0x${clean.length % 2 ? `0${clean}` : clean}`.toLowerCase();
}

function hexToBigInt(value) {
  const clean = strip0x(value);
  return clean ? BigInt(`0x${clean}`) : 0n;
}

function bigIntToWord(value) {
  const bigint = typeof value === "bigint" ? value : BigInt(value);
  if (bigint < 0n) throw new Error("Cannot ABI-encode a negative integer");
  return bigint.toString(16).padStart(64, "0");
}

function addressToWord(address) {
  if (!addressRegex.test(address)) throw new Error("Invalid EVM address");
  return strip0x(address).toLowerCase().padStart(64, "0");
}

function encodeAddressUint(selector, address, amount) {
  return encodeStaticWords(selector, [addressToWord(address), bigIntToWord(amount)]);
}

function parseDecimalToUnits(value, decimals = 18) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Amount must be a decimal number");
  const [whole, fraction = ""] = trimmed.split(".");
  const safeDecimals = Math.max(0, Number(decimals) || 0);
  const paddedFraction = fraction.padEnd(safeDecimals, "0").slice(0, safeDecimals);
  return BigInt(whole || "0") * 10n ** BigInt(safeDecimals) + BigInt(paddedFraction || "0");
}

function parseSlippageBps(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return 3000n;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) throw new Error("Slippage must be a percent from 0 to 100");
  const [whole, fraction = ""] = trimmed.split(".");
  const bps = BigInt(whole || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2) || "0");
  if (bps < 0n || bps > slippageDenominator) throw new Error("Slippage must be between 0 and 100");
  return bps;
}

function parseDecimals(value) {
  const trimmed = String(value || "").trim() || "18";
  if (!/^\d+$/.test(trimmed)) throw new Error("Decimals 必须是整数");
  const decimals = Number(trimmed);
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("Decimals 范围必须是 0 到 255");
  }
  return decimals;
}

function formatSlippageBps(bps) {
  const value = typeof bps === "bigint" ? bps : BigInt(bps || 0);
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}%` : `${whole}%`;
}

function applySlippage(amount, slippageBps) {
  return (BigInt(amount || 0) * (slippageDenominator - slippageBps)) / slippageDenominator;
}

function scaleAmount(amount, newInput, originalInput) {
  const oldInput = BigInt(originalInput || 0);
  if (oldInput === 0n) return null;
  return (BigInt(amount || 0) * BigInt(newInput || 0)) / oldInput;
}

function computeMinOut({ actualOutput, originalMinOut, originalInput, newInput, slippageBps, forceZero }) {
  if (forceZero) {
    return {
      value: 0n,
      mode: "zero",
      message: "最小输出已设为 0，成交更容易，但滑点/夹子风险更高"
    };
  }

  const basis = actualOutput ?? originalMinOut;
  const scaled = basis != null ? scaleAmount(basis, newInput, originalInput) : null;
  if (scaled != null) {
    return {
      value: applySlippage(scaled, slippageBps),
      mode: "slippage",
      message: `已按原成交比例并扣 ${formatSlippageBps(slippageBps)} 滑点重算最小输出`
    };
  }

  return {
    value: originalMinOut ?? 0n,
    mode: "preserve",
    message: "没有足够数据重算最小输出，已保留原交易的最小输出字段"
  };
}

function formatUnits(amount, decimals = 18, maxFraction = 8) {
  const value = BigInt(amount || 0);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fractionText.slice(0, maxFraction)}`;
}

function splitWordsFromCalldata(input) {
  const body = strip0x(input).slice(8);
  const words = [];
  for (let i = 0; i < body.length; i += 64) {
    words.push(body.slice(i, i + 64).padEnd(64, "0"));
  }
  return words;
}

function wordToAddress(word) {
  const clean = strip0x(word).padStart(64, "0");
  return `0x${clean.slice(24).toLowerCase()}`;
}

function encodeStaticWords(selector, words) {
  return normalizeHex(`${strip0x(selector).slice(0, 8)}${words.join("")}`);
}

function replaceWordOccurrences(hexData, oldWord, newWord) {
  const clean = strip0x(hexData);
  const selector = clean.length >= 8 ? clean.slice(0, 8) : "";
  const body = clean.slice(selector.length);
  let count = 0;
  let output = "";
  for (let i = 0; i < body.length; i += 64) {
    const word = body.slice(i, i + 64);
    if (word.toLowerCase() === oldWord.toLowerCase()) {
      output += newWord.toLowerCase();
      count += 1;
    } else {
      output += word;
    }
  }
  return { data: `0x${selector}${output}`, count };
}

function replacePaddedAddressEverywhere(hexData, fromAddress, toAddress) {
  return replaceWordOccurrences(hexData, addressToWord(fromAddress), addressToWord(toAddress));
}

function parseTransferLog(log) {
  if (!Array.isArray(log.topics) || log.topics.length < 3) return null;
  if (String(log.topics[0]).toLowerCase() !== transferTopic) return null;
  return {
    token: normalizeAddress(log.address),
    from: wordToAddress(log.topics[1]),
    to: wordToAddress(log.topics[2]),
    amount: hexToBigInt(log.data || "0x0"),
    logIndex: Number(hexToBigInt(log.logIndex || "0x0"))
  };
}

async function ethRpc(method, params = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  try {
    const response = await fetch(defaultEthRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "RPC request failed");
    return payload.result;
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error("RPC 请求超时，请稍后重试");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function ethCall(to, data, options = {}) {
  const tx = { to, data };
  if (options.from) tx.from = options.from;
  if (options.value) tx.value = options.value;
  return ethRpc("eth_call", [tx, options.blockTag || "latest"]);
}

async function tryEthCall(tx, blockTag = "latest") {
  try {
    const result = await ethRpc("eth_call", [tx, blockTag]);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function hexToUtf8(hexValue) {
  const clean = strip0x(hexValue);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

function decodeAbiStringResult(hexValue) {
  const clean = strip0x(hexValue);
  if (!clean || clean === "0".repeat(clean.length)) return "";
  try {
    if (clean.length >= 128) {
      const offset = Number(hexToBigInt(clean.slice(0, 64)));
      const lengthStart = offset * 2;
      const byteLength = Number(hexToBigInt(clean.slice(lengthStart, lengthStart + 64)));
      return hexToUtf8(clean.slice(lengthStart + 64, lengthStart + 64 + byteLength * 2));
    }
    return hexToUtf8(clean.slice(0, 64));
  } catch {
    return "";
  }
}

async function getTokenMeta(tokenAddress, cache) {
  const address = normalizeAddress(tokenAddress);
  if (cache.has(address)) return cache.get(address);
  const fallback = { address, name: "", symbol: "", decimals: 18 };
  cache.set(address, fallback);
  try {
    const [nameRaw, symbolRaw, decimalsRaw] = await Promise.allSettled([
      ethCall(address, "0x06fdde03"),
      ethCall(address, "0x95d89b41"),
      ethCall(address, "0x313ce567")
    ]);
    const meta = {
      address,
      name: nameRaw.status === "fulfilled" ? decodeAbiStringResult(nameRaw.value) : "",
      symbol: symbolRaw.status === "fulfilled" ? decodeAbiStringResult(symbolRaw.value) : "",
      decimals:
        decimalsRaw.status === "fulfilled" && decimalsRaw.value
          ? Number(hexToBigInt(decimalsRaw.value))
          : 18
    };
    cache.set(address, meta);
    return meta;
  } catch {
    return fallback;
  }
}

function decodeV2EthSwap(input) {
  const selector = normalizeHex(input).slice(0, 10);
  const words = splitWordsFromCalldata(input);
  if (words.length < 5) return null;
  const pathOffset = Number(hexToBigInt(words[1])) / 32;
  if (!Number.isInteger(pathOffset) || pathOffset < 4 || pathOffset >= words.length) return null;
  const pathLength = Number(hexToBigInt(words[pathOffset]));
  const path = [];
  for (let i = 0; i < pathLength; i += 1) path.push(wordToAddress(words[pathOffset + 1 + i]));
  return {
    selector,
    amountOutMin: hexToBigInt(words[0]),
    recipient: wordToAddress(words[2]),
    deadline: hexToBigInt(words[3]),
    path
  };
}

function encodeV2EthSwap(selector, decoded) {
  return encodeStaticWords(selector, [
    bigIntToWord(decoded.amountOutMin),
    bigIntToWord(128n),
    addressToWord(decoded.recipient),
    bigIntToWord(decoded.deadline),
    bigIntToWord(BigInt(decoded.path.length)),
    ...decoded.path.map(addressToWord)
  ]);
}

function decodeV2TokenSwap(input) {
  const selector = normalizeHex(input).slice(0, 10);
  const words = splitWordsFromCalldata(input);
  if (words.length < 6) return null;
  const pathOffset = Number(hexToBigInt(words[2])) / 32;
  if (!Number.isInteger(pathOffset) || pathOffset < 5 || pathOffset >= words.length) return null;
  const pathLength = Number(hexToBigInt(words[pathOffset]));
  const path = [];
  for (let i = 0; i < pathLength; i += 1) path.push(wordToAddress(words[pathOffset + 1 + i]));
  return {
    selector,
    amountIn: hexToBigInt(words[0]),
    amountOutMin: hexToBigInt(words[1]),
    recipient: wordToAddress(words[3]),
    deadline: hexToBigInt(words[4]),
    path
  };
}

function encodeV2TokenSwap(selector, decoded) {
  return encodeStaticWords(selector, [
    bigIntToWord(decoded.amountIn),
    bigIntToWord(decoded.amountOutMin),
    bigIntToWord(160n),
    addressToWord(decoded.recipient),
    bigIntToWord(decoded.deadline),
    bigIntToWord(BigInt(decoded.path.length)),
    ...decoded.path.map(addressToWord)
  ]);
}

function buildApproveTransaction(token, spender, amountRaw, tokenMeta = {}) {
  if (!token || !spender || amountRaw == null) return null;
  const amount = BigInt(amountRaw);
  return {
    to: normalizeAddress(token),
    valueWei: "0",
    valueEth: "0",
    data: encodeStaticWords("0x095ea7b3", [addressToWord(spender), bigIntToWord(amount)]),
    spender: normalizeAddress(spender),
    amountRaw: amount.toString(),
    amount: formatUnits(amount, tokenMeta.decimals ?? 18, 8),
    symbol: tokenMeta.symbol || "TOKEN"
  };
}

function encodeBalanceOf(owner) {
  return encodeStaticWords("0x70a08231", [addressToWord(owner)]);
}

function encodeTransfer(to, amount) {
  return encodeAddressUint("0xa9059cbb", to, amount);
}

function encodeTotalSupply() {
  return "0x18160ddd";
}

async function getTokenBalance(token, owner) {
  const result = await ethCall(token, encodeBalanceOf(owner));
  return hexToBigInt(result || "0x0");
}

async function getTotalSupply(token) {
  const result = await ethCall(token, encodeTotalSupply());
  return hexToBigInt(result || "0x0");
}

function isSuccessfulBoolReturn(result) {
  const clean = strip0x(result || "");
  if (!clean) return true;
  return hexToBigInt(clean.slice(-64) || "0") !== 0n;
}

function buildGeneratedBuyTransaction(tx, options) {
  const buyerAddress = options.walletAddress ? normalizeAddress(options.walletAddress) : "";
  const newValueWei = options.valueWei ?? hexToBigInt(tx.value || "0x0");
  const originalValueWei = hexToBigInt(tx.value || "0x0");
  const selector = normalizeHex(tx.input || "0x").slice(0, 10);
  const forceMinOutZero = Boolean(options.forceMinOutZero);
  const slippageBps = options.slippageBps ?? 3000n;
  const actualOutput =
    options.primaryReceivedToken?.amountRaw != null ? BigInt(options.primaryReceivedToken.amountRaw) : null;
  const changes = [];
  const warnings = [];
  let confidence = "medium";
  let data = normalizeHex(tx.input || "0x");

  if (!buyerAddress) return null;

  if (selector === "0x7ff36ab5" || selector === "0xb6f9de95") {
    const decoded = decodeV2EthSwap(data);
    if (decoded) {
      decoded.recipient = buyerAddress;
      decoded.deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const minOut = computeMinOut({
        actualOutput,
        originalMinOut: decoded.amountOutMin,
        originalInput: originalValueWei,
        newInput: newValueWei,
        slippageBps,
        forceZero: forceMinOutZero
      });
      decoded.amountOutMin = minOut.value;
      data = encodeV2EthSwap(selector, decoded);
      confidence = "high";
      changes.push("已把 V2 swap 接收地址改成你的钱包");
      changes.push("已把 deadline 刷新为 1 小时内有效");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0x077587dd") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 8) {
      words[5] = addressToWord(buyerAddress);
      words[6] = addressToWord(buyerAddress);
      const minOut = computeMinOut({
        actualOutput,
        originalMinOut: hexToBigInt(words[7]),
        originalInput: originalValueWei,
        newInput: newValueWei,
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[7] = bigIntToWord(minOut.value);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      changes.push("已把自定义买入路由里的 recipient/payer 改成你的钱包");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0xd96a094a") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 1) {
      const minOut = computeMinOut({
        actualOutput,
        originalMinOut: hexToBigInt(words[0]),
        originalInput: originalValueWei,
        newInput: newValueWei,
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[0] = bigIntToWord(minOut.value);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0xeffbec13") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 5) {
      words[2] = bigIntToWord(newValueWei);
      const minOut = computeMinOut({
        actualOutput,
        originalMinOut: hexToBigInt(words[3]),
        originalInput: originalValueWei,
        newInput: newValueWei,
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[3] = bigIntToWord(minOut.value);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      changes.push("已把 swap 的 amountIn 改成新的 ETH 数量");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else {
    const addressReplace = replacePaddedAddressEverywhere(data, tx.from, buyerAddress);
    data = addressReplace.data;
    if (addressReplace.count > 0) changes.push(`已替换 ${addressReplace.count} 处原买家地址`);
    else warnings.push("calldata 里没有发现原买家地址，可能使用 msg.sender 或特殊 recipient");

    if (originalValueWei > 0n && newValueWei !== originalValueWei) {
      const valueReplace = replaceWordOccurrences(data, bigIntToWord(originalValueWei), bigIntToWord(newValueWei));
      data = valueReplace.data;
      if (valueReplace.count > 0) changes.push(`已替换 ${valueReplace.count} 处原 ETH 数量字段`);
      else warnings.push("calldata 里没有发现原 ETH 数量字段，只修改外层 Value");
    }

    confidence = selector === "0x24856bc3" || selector === "0x3593564c" ? "medium" : "low";
    warnings.push(
      confidence === "medium"
        ? "Universal Router/V4 的内部路径较复杂，本工具会替换地址和金额，但不会盲目改所有最小输出"
        : "未知方法，只做通用地址/金额替换；发交易前建议先小额测试"
    );
  }

  return {
    to: normalizeAddress(tx.to || "0x0000000000000000000000000000000000000000"),
    valueWei: newValueWei.toString(),
    valueEth: formatUnits(newValueWei, 18, 18),
    data,
    confidence,
    changes,
    warnings,
    slippagePercent: formatSlippageBps(slippageBps),
    forceMinOutZero
  };
}

function buildGeneratedSellTransaction(tx, options, context = {}) {
  const walletAddress = options.walletAddress ? normalizeAddress(options.walletAddress) : "";
  const selector = normalizeHex(tx.input || "0x").slice(0, 10);
  const forceMinOutZero = Boolean(options.forceMinOutZero);
  const slippageBps = options.slippageBps ?? 3000n;
  const originalSellAmount =
    context.primarySentToken?.amountRaw != null ? BigInt(context.primarySentToken.amountRaw) : null;
  const sellAmountRaw = options.sellAmountRaw ?? originalSellAmount;
  const changes = [];
  const warnings = [];
  let confidence = "medium";
  let data = normalizeHex(tx.input || "0x");

  if (!walletAddress) return null;
  if (sellAmountRaw == null) warnings.push("没从日志里识别出卖出的 ERC20 数量；只能做地址替换");

  if (
    selector === "0x18cbafe5" ||
    selector === "0x791ac947" ||
    selector === "0x38ed1739" ||
    selector === "0x5c11d795"
  ) {
    const decoded = decodeV2TokenSwap(data);
    if (decoded) {
      const originalDecodedAmountIn = decoded.amountIn;
      if (sellAmountRaw != null) decoded.amountIn = sellAmountRaw;
      decoded.recipient = walletAddress;
      decoded.deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const minOut = computeMinOut({
        actualOutput: null,
        originalMinOut: decoded.amountOutMin,
        originalInput: originalSellAmount ?? originalDecodedAmountIn,
        newInput: sellAmountRaw ?? decoded.amountIn,
        slippageBps,
        forceZero: forceMinOutZero
      });
      decoded.amountOutMin = minOut.value;
      data = encodeV2TokenSwap(selector, decoded);
      confidence = "high";
      changes.push("已把 V2 卖出数量改成你的输入");
      changes.push("已把 ETH/代币接收地址改成你的钱包");
      changes.push("已把 deadline 刷新为 1 小时内有效");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0x286d4c33") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 9) {
      const minOut = computeMinOut({
        actualOutput: null,
        originalMinOut: hexToBigInt(words[0]),
        originalInput: originalSellAmount,
        newInput: sellAmountRaw ?? originalSellAmount,
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[0] = bigIntToWord(minOut.value);
      words[5] = addressToWord(walletAddress);
      words[6] = addressToWord(walletAddress);
      if (sellAmountRaw != null) words[7] = bigIntToWord(sellAmountRaw);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      changes.push("已把自定义卖出路由里的 sender/recipient 改成你的钱包");
      if (sellAmountRaw != null) changes.push("已把卖出数量改成你的输入");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0xd79875eb") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 2) {
      if (sellAmountRaw != null) words[0] = bigIntToWord(sellAmountRaw);
      const minOut = computeMinOut({
        actualOutput: null,
        originalMinOut: hexToBigInt(words[1]),
        originalInput: originalSellAmount ?? hexToBigInt(words[0]),
        newInput: sellAmountRaw ?? originalSellAmount ?? hexToBigInt(words[0]),
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[1] = bigIntToWord(minOut.value);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      if (sellAmountRaw != null) changes.push("已把 sell(amountIn,minEthOut) 的卖出数量改成你的输入");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else if (selector === "0xb2703a63") {
    const words = splitWordsFromCalldata(data);
    if (words.length >= 4) {
      if (sellAmountRaw != null) words[0] = bigIntToWord(sellAmountRaw);
      const minOut = computeMinOut({
        actualOutput: null,
        originalMinOut: hexToBigInt(words[1]),
        originalInput: originalSellAmount,
        newInput: sellAmountRaw ?? originalSellAmount,
        slippageBps,
        forceZero: forceMinOutZero
      });
      words[1] = bigIntToWord(minOut.value);
      words[3] = addressToWord(walletAddress);
      data = encodeStaticWords(selector, words);
      confidence = "high";
      changes.push("已把 V4/hook 卖出路由里的卖家地址改成你的钱包");
      if (sellAmountRaw != null) changes.push("已把卖出数量改成你的输入");
      changes.push(minOut.message);
      if (minOut.mode === "zero") warnings.push(minOut.message);
    }
  } else {
    const addressReplace = replacePaddedAddressEverywhere(data, tx.from, walletAddress);
    data = addressReplace.data;
    if (addressReplace.count > 0) changes.push(`已替换 ${addressReplace.count} 处原卖家地址`);
    else warnings.push("calldata 里没有发现原卖家地址，可能使用 msg.sender、Permit2 或打包路径");

    if (originalSellAmount != null && sellAmountRaw != null && sellAmountRaw !== originalSellAmount) {
      const amountReplace = replaceWordOccurrences(
        data,
        bigIntToWord(originalSellAmount),
        bigIntToWord(sellAmountRaw)
      );
      data = amountReplace.data;
      if (amountReplace.count > 0) changes.push(`已替换 ${amountReplace.count} 处原卖出数量字段`);
      else warnings.push("calldata 里没有发现标准 32-byte 卖出数量字段，可能是 packed route");
    }

    confidence = "low";
    warnings.push(
      selector === "0x24856bc3" || selector === "0x3593564c" || selector === "0x08c1284c"
        ? "这是打包路由/Universal Router，路径较复杂；工具只做安全可见字段替换，务必先小额测试"
        : "未知卖出方法，只做通用地址/数量替换；发交易前建议先小额测试"
    );
  }

  const router = normalizeAddress(tx.to || "0x0000000000000000000000000000000000000000");
  const tokenMeta = context.primarySentToken || {};
  const approve =
    context.primarySentToken && sellAmountRaw != null
      ? buildApproveTransaction(context.primarySentToken.token, router, sellAmountRaw, tokenMeta)
      : null;

  if (approve) changes.push(`已生成 ${approve.symbol} 授权交易，spender 是卖出路由`);
  else warnings.push("没有生成授权交易，因为没识别出卖出的 ERC20 token");

  return {
    to: router,
    valueWei: "0",
    valueEth: "0",
    data,
    confidence,
    changes,
    warnings,
    approve,
    slippagePercent: formatSlippageBps(slippageBps),
    forceMinOutZero
  };
}

function collectAddressWords(input) {
  const clean = strip0x(input || "");
  const addresses = [];
  const seen = new Set();
  for (let i = 8; i + 64 <= clean.length; i += 64) {
    const word = clean.slice(i, i + 64);
    let value = 0n;
    try {
      value = hexToBigInt(word);
    } catch {
      value = 0n;
    }
    if (value === 0n || value > (1n << 160n) - 1n) continue;
    const address = wordToAddress(word);
    if (address === zeroAddress || seen.has(address)) continue;
    seen.add(address);
    addresses.push(address);
  }
  return addresses;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function choosePrimaryToken(transfers, fromAddress, metaCache) {
  const nonWeth = transfers.filter((transfer) => transfer.token !== wethAddress);
  const directBuy = nonWeth.find((transfer) => transfer.to === fromAddress && transfer.amount > 0n);
  const mint = nonWeth.find((transfer) => transfer.from === zeroAddress && transfer.amount > 0n);
  const fallback = nonWeth.find((transfer) => transfer.amount > 0n);
  const selected = directBuy || mint || fallback || null;
  if (!selected) return null;
  const meta = metaCache.get(selected.token) || { symbol: "TOKEN", name: "", decimals: 18 };
  return {
    token: selected.token,
    symbol: meta.symbol || "TOKEN",
    name: meta.name || "",
    decimals: meta.decimals ?? 18,
    sampleHolder: selected.to,
    source: directBuy ? "buy 接收" : mint ? "mint 接收" : "日志推断"
  };
}

function summarizeTransfers(transfers, metaCache) {
  return transfers.slice(0, 20).map((transfer) => {
    const meta = metaCache.get(transfer.token) || { symbol: "TOKEN", decimals: 18 };
    return {
      token: transfer.token,
      symbol: meta.symbol || "TOKEN",
      from: transfer.from,
      to: transfer.to,
      amount: formatUnits(transfer.amount, meta.decimals ?? 18, 8),
      amountRaw: transfer.amount.toString()
    };
  });
}

function sumAmounts(transfers) {
  return transfers.reduce((total, transfer) => total + BigInt(transfer.amount || 0), 0n);
}

function formatTaxRatio(taxAmount, basisAmount) {
  const basis = BigInt(basisAmount || 0);
  if (basis <= 0n) return "无法估算";
  const tax = BigInt(taxAmount || 0);
  const bps = (tax * 10000n) / basis;
  const whole = bps / 100n;
  const fraction = (bps % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${fraction ? `${whole}.${fraction}` : whole.toString()}%`;
}

function estimateTransferTaxes(transfers, primaryToken, traderAddress, pool) {
  if (!primaryToken) {
    return {
      buyTax: "未识别代币",
      sellTax: "未识别代币",
      notes: ["无法识别主代币，不能估算买卖税。"]
    };
  }

  const tokenTransfers = transfers.filter((transfer) => transfer.token === primaryToken.token && transfer.amount > 0n);
  const notes = [];
  let buyTax = "需要最早买入 tx 日志";
  let sellTax = "需要成功卖出 tx 日志";

  const buyReceipts = tokenTransfers.filter((transfer) => transfer.to === traderAddress && transfer.from !== zeroAddress);
  const buySources = new Set(buyReceipts.map((transfer) => transfer.from));
  const buyReceived = sumAmounts(buyReceipts);
  const buyDistributed = sumAmounts(tokenTransfers.filter((transfer) => buySources.has(transfer.from)));
  if (buyReceived > 0n && buyDistributed >= buyReceived) {
    buyTax = `${formatTaxRatio(buyDistributed - buyReceived, buyDistributed)}（日志估算）`;
    notes.push(
      buyDistributed === buyReceived
        ? "买入日志没有看到额外扣税转账。"
        : "买税按同一出币地址分发总量与买家实际收到量估算。"
    );
  }

  const sellTransfers = tokenTransfers.filter((transfer) => transfer.from === traderAddress && transfer.to !== zeroAddress);
  const sellSent = sumAmounts(sellTransfers);
  if (sellSent > 0n) {
    const poolTargets = new Set([
      pool?.poolTarget,
      pool?.router,
      ...(pool?.endpointCandidates || []).map((item) => item.address)
    ].filter(Boolean));
    const sellToPool = sumAmounts(sellTransfers.filter((transfer) => poolTargets.has(transfer.to)));
    if (sellToPool > 0n && sellSent >= sellToPool) {
      sellTax = `${formatTaxRatio(sellSent - sellToPool, sellSent)}（日志估算）`;
      notes.push(
        sellSent === sellToPool
          ? "卖出日志没有看到额外扣税转账。"
          : "卖税按卖家转出总量与进入池子/路由量估算。"
      );
    } else {
      sellTax = "卖出方向日志不足";
    }
  }

  if (!notes.length) notes.push("税率只能根据交易日志估算；仅凭合约地址无法精确计算买卖税。");
  return { buyTax, sellTax, notes };
}

function findPoolSignals(tx, receipt, transfers, tokenAddress) {
  const logs = receipt?.logs || [];
  const tokenSet = new Set([tokenAddress, wethAddress].filter(Boolean).map(normalizeAddress));
  const logAddresses = uniq(logs.map((log) => normalizeAddress(log.address || zeroAddress)));
  const nonTokenLogAddresses = logAddresses.filter((address) => !tokenSet.has(address));
  const hasV4PoolManager = logAddresses.includes(v4PoolManagerAddress);

  const endpointStats = new Map();
  for (const transfer of transfers) {
    for (const [side, address] of [["from", transfer.from], ["to", transfer.to]]) {
      if (!address || address === zeroAddress) continue;
      if (!endpointStats.has(address)) {
        endpointStats.set(address, { address, in: 0, out: 0, tokens: new Set(), directions: new Set() });
      }
      const stat = endpointStats.get(address);
      stat.tokens.add(transfer.token);
      stat.directions.add(side);
      if (side === "to") stat.in += 1;
      else stat.out += 1;
    }
  }

  const endpointCandidates = [...endpointStats.values()]
    .filter((stat) => {
      if (stat.address === zeroAddress || stat.address === normalizeAddress(tx.from || zeroAddress)) return false;
      if (tokenSet.has(stat.address)) return false;
      return stat.tokens.size >= 2 || stat.address === v4PoolManagerAddress;
    })
    .sort((a, b) => b.tokens.size - a.tokens.size || b.in + b.out - (a.in + a.out))
    .slice(0, 8)
    .map((stat) => ({
      address: stat.address,
      tokens: [...stat.tokens],
      text: `${stat.address} / tokens:${stat.tokens.size} in:${stat.in} out:${stat.out}`
    }));

  const poolIdCandidates = uniq(
    logs
      .filter((log) => normalizeAddress(log.address || zeroAddress) === v4PoolManagerAddress)
      .flatMap((log) => (log.topics || []).slice(1))
      .filter((topic) => /^0x[a-fA-F0-9]{64}$/.test(String(topic || "")))
      .map((topic) => normalizeHex(topic))
  ).slice(0, 8);

  const addressWords = collectAddressWords(tx.input || "0x");
  const knownAddresses = new Set([
    normalizeAddress(tx.from || zeroAddress),
    tx.to ? normalizeAddress(tx.to) : "",
    tokenAddress,
    wethAddress,
    v4PoolManagerAddress,
    permit2Address,
    universalRouterAddress,
    universalRouter211Address
  ].filter(Boolean));
  const hookCandidates = addressWords.filter((address) => !knownAddresses.has(address)).slice(0, 10);
  const router = tx.to ? normalizeAddress(tx.to) : "";
  const poolTarget =
    hasV4PoolManager
      ? v4PoolManagerAddress
      : endpointCandidates[0]?.address || nonTokenLogAddresses.find((address) => address !== router) || router;

  return {
    protocol: hasV4PoolManager ? "Uniswap v4 / PoolManager" : "非 v4 或未知池子",
    poolManager: hasV4PoolManager ? v4PoolManagerAddress : "",
    poolIdCandidates,
    hookCandidates,
    logAddressCandidates: nonTokenLogAddresses.slice(0, 12),
    endpointCandidates,
    poolTarget,
    router
  };
}

async function pickProbeHolder(token, primaryToken, transfers, overrideHolder) {
  const candidateHolders = uniq([
    overrideHolder,
    primaryToken?.sampleHolder,
    ...transfers.filter((transfer) => transfer.token === token).map((transfer) => transfer.to)
  ].filter((address) => address && address !== zeroAddress && address !== v4PoolManagerAddress));

  for (const holder of candidateHolders.slice(0, 8)) {
    try {
      const balance = await getTokenBalance(token, holder);
      if (balance > 0n) return { holder, balance };
    } catch {
      // Try the next holder.
    }
  }
  return { holder: candidateHolders[0] || "", balance: 0n };
}

function makeCallSummary(result, okText, failText) {
  if (result.ok) {
    const boolOk = isSuccessfulBoolReturn(result.result);
    return boolOk ? okText : `${failText}：返回 false`;
  }
  return `${failText}：${result.error}`;
}

async function analyzeTokenOnly(tokenAddress, holderAddress = "") {
  const token = normalizeAddress(tokenAddress);
  const metaCache = new Map();
  const meta = await getTokenMeta(token, metaCache);
  const [code, totalSupplyResult] = await Promise.allSettled([
    ethRpc("eth_getCode", [token, "latest"]),
    getTotalSupply(token)
  ]);
  const warnings = [];
  const positives = [];
  const simulations = [];

  if (code.status !== "fulfilled" || !code.value || code.value === "0x") {
    warnings.push("这个地址当前没有合约代码，可能不是 ERC20 合约。");
  } else {
    positives.push("代币合约代码存在。");
  }

  const totalSupply = totalSupplyResult.status === "fulfilled" ? totalSupplyResult.value : 0n;
  if (totalSupply > 0n) positives.push("totalSupply 可读取。");
  else warnings.push("totalSupply 读取失败或为 0，代币可能不是标准 ERC20。");

  let holder = holderAddress ? normalizeAddress(holderAddress) : "";
  let holderBalance = 0n;
  if (holder) {
    try {
      holderBalance = await getTokenBalance(token, holder);
      simulations.push({
        label: "余额读取",
        ok: true,
        text: `通过：持币地址余额 ${formatUnits(holderBalance, meta.decimals ?? 18, 8)} ${meta.symbol || "TOKEN"}`
      });
    } catch (err) {
      warnings.push(`持币地址余额读取失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  warnings.push("仅输入代币合约不能知道具体池子/Hook，也不能精确估算买卖税；建议输入最早买入 tx。");
  const taxEstimates = {
    buyTax: "需要最早买入 tx 日志",
    sellTax: "需要成功卖出 tx 或 fork 模拟",
    notes: ["仅凭合约地址无法精确计算买卖税。"]
  };

  return {
    tx: {
      hash: "仅合约检测",
      from: "",
      to: token,
      valueEth: "0",
      selector: "contract",
      blockNumber: null
    },
    primaryToken: {
      token,
      symbol: meta.symbol || "TOKEN",
      name: meta.name || "",
      decimals: meta.decimals ?? 18,
      sampleHolder: holder,
      source: "合约输入"
    },
    holder,
    holderBalance: formatUnits(holderBalance, meta.decimals ?? 18, 8),
    probeAmount: "0",
    pool: {
      protocol: "仅合约检测",
      poolManager: "",
      poolIdCandidates: [],
      hookCandidates: [],
      logAddressCandidates: [],
      endpointCandidates: [],
      poolTarget: "",
      router: ""
    },
    transfers: [],
    simulations,
    positives,
    warnings,
    taxEstimates,
    risk: warnings.length ? "medium" : "low"
  };
}

async function analyzeProbe(payload) {
  if (payload.tokenAddress && !payload.txHash) {
    return analyzeTokenOnly(payload.tokenAddress, payload.holderAddress);
  }

  const [tx, receipt] = await Promise.all([
    ethRpc("eth_getTransactionByHash", [payload.txHash]),
    ethRpc("eth_getTransactionReceipt", [payload.txHash])
  ]);
  if (!tx) throw new Error("RPC 没查到这笔交易");

  const transfers = receipt?.logs?.map(parseTransferLog).filter(Boolean) || [];
  const metaCache = new Map();
  await Promise.all([...new Set(transfers.map((transfer) => transfer.token))].map((token) => getTokenMeta(token, metaCache)));

  const fromAddress = normalizeAddress(tx.from);
  const primaryToken = choosePrimaryToken(transfers, fromAddress, metaCache);
  const pool = findPoolSignals(tx, receipt, transfers, primaryToken?.token || "");
  const taxEstimates = estimateTransferTaxes(transfers, primaryToken, fromAddress, pool);
  const simulations = [];
  const warnings = [];
  const positives = [];

  if (!primaryToken) {
    warnings.push("没有从这笔交易日志里识别出非 WETH ERC20，可能不是 buy/mint 交易。");
  }

  const receivedTokens = transfers.filter(
    (transfer) => primaryToken && transfer.token === primaryToken.token && transfer.to === fromAddress
  );
  const generatedBuy = primaryToken
    ? buildGeneratedBuyTransaction(tx, {
        walletAddress: fromAddress,
        valueWei: hexToBigInt(tx.value || "0x0"),
        forceMinOutZero: true,
        slippageBps: slippageDenominator,
        primaryReceivedToken: receivedTokens[0]
          ? {
              amountRaw: receivedTokens[0].amount.toString(),
              decimals: primaryToken.decimals
            }
          : null
      })
    : null;

  const buyCall = await tryEthCall({
    from: fromAddress,
    to: generatedBuy?.to || normalizeAddress(tx.to || zeroAddress),
    value: tx.value || "0x0",
    data: generatedBuy?.data || tx.input || "0x"
  });
  simulations.push({
    label: "买入预检",
    ok: buyCall.ok,
    text: makeCallSummary(
      buyCall,
      generatedBuy ? "通过：按当前状态重放买入参数未 revert" : "通过：原始 calldata 重放未 revert",
      generatedBuy ? "失败：当前状态下买入参数会 revert" : "失败：原始 calldata 当前会 revert"
    )
  });
  if (buyCall.ok) positives.push("买入预检未 revert。");
  else warnings.push("买入预检失败，可能是 deadline、余额、池子状态或 Hook 限制导致。");

  let holderInfo = { holder: "", balance: 0n };
  if (primaryToken) {
    holderInfo = await pickProbeHolder(primaryToken.token, primaryToken, transfers, payload.holderAddress);
  }

  const probeAmount =
    primaryToken && holderInfo.balance > 0n
      ? holderInfo.balance > 10n ** BigInt(primaryToken.decimals) ? 10n ** BigInt(primaryToken.decimals) : holderInfo.balance
      : 0n;

  if (primaryToken && holderInfo.holder && probeAmount > 0n && pool.poolTarget) {
    const approveTx = buildApproveTransaction(primaryToken.token, pool.router || pool.poolTarget, probeAmount, primaryToken);
    const approveCall = await tryEthCall({
      from: holderInfo.holder,
      to: approveTx.to,
      data: approveTx.data
    });
    simulations.push({
      label: "授权预检",
      ok: approveCall.ok && isSuccessfulBoolReturn(approveCall.result),
      text: makeCallSummary(approveCall, "通过：approve 不会直接 revert", "失败：approve 会 revert")
    });

    const transferCall = await tryEthCall({
      from: holderInfo.holder,
      to: primaryToken.token,
      data: encodeTransfer(pool.poolTarget, probeAmount)
    });
    const transferOk = transferCall.ok && isSuccessfulBoolReturn(transferCall.result);
    simulations.push({
      label: "卖出转账预检",
      ok: transferOk,
      text: makeCallSummary(
        transferCall,
        `通过：从持币地址转 ${formatUnits(probeAmount, primaryToken.decimals, 8)} ${primaryToken.symbol} 到池子/路由未 revert`,
        "失败：代币转入池子/路由会 revert"
      )
    });
    if (transferOk) positives.push("代币转入池子/路由预检未 revert。");
    else warnings.push("卖出转账预检失败，这是强风险信号，但仍不能覆盖所有 Hook 内部限制。");
  } else if (primaryToken) {
    warnings.push("没有可用持币余额，无法做卖出方向的 transfer 预检；可以在持币地址里手动填一个有余额的钱包再测。");
  }

  if (pool.poolManager) {
    warnings.push("该交易命中 Uniswap v4 PoolManager。v4 没有传统 LP 合约地址，池子由 PoolId 识别，Hook 可能在 swap 时执行额外限制。");
  }
  if (!pool.hookCandidates.length && pool.poolManager) {
    warnings.push("没有从 calldata 里明确提取出 Hook 地址；可能是打包路由或 Hook 地址不在标准 32-byte address word 里。");
  }

  const risk =
    simulations.some((item) => item.label.includes("卖出") && !item.ok) || simulations.some((item) => item.label === "授权预检" && !item.ok)
      ? "high"
      : warnings.length
        ? "medium"
        : "low";

  return {
    tx: {
      hash: normalizeHex(tx.hash),
      from: fromAddress,
      to: tx.to ? normalizeAddress(tx.to) : "",
      valueEth: formatUnits(hexToBigInt(tx.value || "0x0"), 18, 18),
      selector: tx.input && tx.input !== "0x" ? normalizeHex(tx.input).slice(0, 10) : "0x",
      blockNumber: tx.blockNumber ? Number(hexToBigInt(tx.blockNumber)) : null
    },
    primaryToken,
    holder: holderInfo.holder,
    holderBalance: primaryToken ? formatUnits(holderInfo.balance, primaryToken.decimals, 8) : "0",
    probeAmount: primaryToken ? formatUnits(probeAmount, primaryToken.decimals, 8) : "0",
    pool,
    transfers: summarizeTransfers(transfers, metaCache),
    simulations,
    positives,
    warnings,
    taxEstimates,
    risk
  };
}

async function analyzeTransaction(payload) {
  const tradeType = payload.tradeType === "sell" ? "sell" : "buy";
  const slippageBps = parseSlippageBps(payload.slippagePercent);
  const forceMinOutZero = payload.forceMinOutZero === true;
  const [tx, receipt] = await Promise.all([
    ethRpc("eth_getTransactionByHash", [payload.txHash]),
    ethRpc("eth_getTransactionReceipt", [payload.txHash])
  ]);
  if (!tx) throw new Error("RPC 没查到这笔交易");

  const selector = tx.input && tx.input !== "0x" ? normalizeHex(tx.input).slice(0, 10) : "0x";
  const transfers = receipt?.logs?.map(parseTransferLog).filter(Boolean) || [];
  const metaCache = new Map();
  await Promise.all([...new Set(transfers.map((transfer) => transfer.token))].map((token) => getTokenMeta(token, metaCache)));

  const enrichedTransfers = transfers.map((transfer) => {
    const meta = metaCache.get(transfer.token) || { symbol: "TOKEN", name: "", decimals: 18 };
    return {
      token: transfer.token,
      symbol: meta.symbol || "TOKEN",
      name: meta.name || "",
      decimals: meta.decimals,
      from: transfer.from,
      to: transfer.to,
      amountRaw: transfer.amount.toString(),
      amount: formatUnits(transfer.amount, meta.decimals, 8),
      logIndex: transfer.logIndex
    };
  });

  const fromAddress = normalizeAddress(tx.from);
  const receivedTokens = enrichedTransfers.filter(
    (transfer) => transfer.to === fromAddress && transfer.token !== wethAddress
  );
  const sentTokens = enrichedTransfers.filter(
    (transfer) => transfer.from === fromAddress && transfer.token !== wethAddress
  );
  const primarySentToken = sentTokens[0] || null;

  let sellAmountRaw = null;
  if (tradeType === "sell") {
    sellAmountRaw = parseDecimalToUnits(payload.tradeAmount, primarySentToken?.decimals ?? 18);
  }

  const valueWei =
    tradeType === "buy" ? parseDecimalToUnits(payload.tradeAmount, 18) ?? hexToBigInt(tx.value || "0x0") : null;

  const generated =
    tradeType === "sell"
      ? buildGeneratedSellTransaction(
          tx,
          { walletAddress: payload.walletAddress, sellAmountRaw, forceMinOutZero, slippageBps },
          { primarySentToken }
        )
      : buildGeneratedBuyTransaction(tx, {
          walletAddress: payload.walletAddress,
          valueWei,
          forceMinOutZero,
          slippageBps,
          primaryReceivedToken: receivedTokens[0] || null
        });

  return {
    tx: {
      hash: normalizeHex(tx.hash),
      status: receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : "unknown",
      from: fromAddress,
      to: tx.to ? normalizeAddress(tx.to) : "",
      valueWei: hexToBigInt(tx.value || "0x0").toString(),
      valueEth: formatUnits(hexToBigInt(tx.value || "0x0"), 18, 18),
      selector,
      method: knownMethods[selector] || "Unknown method",
      blockNumber: tx.blockNumber ? Number(hexToBigInt(tx.blockNumber)) : null,
      etherscanUrl: `https://etherscan.io/tx/${normalizeHex(tx.hash)}`
    },
    tradeType,
    receivedTokens,
    sentTokens,
    transfers: enrichedTransfers.slice(0, 60),
    generated,
    slippage: {
      percent: formatSlippageBps(slippageBps),
      forceMinOutZero
    },
    notes: [
      "工具只生成交易参数，不会发送交易。",
      "新币池子很薄时，最小输出设为 0 虽然更容易成交，但更容易被滑点或夹子吃掉。",
      "卖出前通常要先发 approve 授权；如果你已经授权过足够额度，可以跳过 approve。"
    ]
  };
}

function shortAddress(value) {
  if (!value || value.length < 12) return value || "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function createMetric(label, value, extraClass = "") {
  const item = document.createElement("div");
  item.className = "metric";
  const labelEl = document.createElement("span");
  labelEl.className = "metric-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = `metric-value ${extraClass}`.trim();
  valueEl.textContent = value;
  item.append(labelEl, valueEl);
  return item;
}

function createCopyRow(label, value, tall = false) {
  const node = copyRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".copy-label").textContent = label;
  const textarea = node.querySelector("textarea");
  textarea.value = value || "";
  if (tall) textarea.style.minHeight = "160px";
  const button = node.querySelector(".copy-btn");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = "复制";
      }, 900);
    } catch {
      textarea.select();
      document.execCommand("copy");
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = "复制";
      }, 900);
    }
  });
  return node;
}

function createCopyGroup(title, rows, txPayload = null) {
  const group = document.createElement("div");
  group.className = "copy-group";
  const heading = document.createElement("div");
  heading.className = "copy-heading";
  const titleEl = document.createElement("p");
  titleEl.className = "copy-group-title";
  titleEl.textContent = title;
  heading.append(titleEl);
  if (txPayload) {
    const loadButton = document.createElement("button");
    loadButton.className = "load-btn";
    loadButton.type = "button";
    loadButton.textContent = "填入发送器";
    loadButton.addEventListener("click", () => fillSender(txPayload, title));
    heading.append(loadButton);
  }
  group.append(heading);
  for (const row of rows) {
    group.append(createCopyRow(row.label, row.value, row.tall));
  }
  return group;
}

function createFillActions(actions) {
  const usableActions = actions.filter((action) => action?.tx);
  const bar = document.createElement("div");
  bar.className = `tx-action-bar ${usableActions.length === 1 ? "single" : ""}`.trim();

  for (const action of usableActions) {
    const button = document.createElement("button");
    button.className = "tx-fill-btn";
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => fillSender(action.tx, action.senderLabel || action.label));
    bar.append(button);
  }

  return bar;
}

function createList(items, className) {
  const list = document.createElement("ul");
  list.className = className;
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
  return list;
}

function createSection(title, content) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, content);
  return section;
}

function renderTokens(tokens, emptyText = "没有识别到直接转入原买家钱包的 ERC20。") {
  const list = document.createElement("ul");
  list.className = "token-list";
  if (!tokens.length) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    list.append(li);
    return list;
  }
  for (const token of tokens) {
    const li = document.createElement("li");
    li.textContent = `${token.amount} ${token.symbol} (${shortAddress(token.token)})`;
    list.append(li);
  }
  return list;
}

function renderResult(data) {
  resultEl.innerHTML = "";
  setFormStatus("解析完成，可以复制右侧参数。", "ok");
  const isSell = data.tradeType === "sell";

  const summary = document.createElement("div");
  summary.className = "summary-grid";
  const status = document.createElement("span");
  status.className = `status ${data.tx.status === "failed" ? "failed" : ""}`.trim();
  status.textContent = data.tx.status;

  summary.append(
    createMetric("原交易", data.tx.hash),
    createMetric("方法", `${data.tx.selector} / ${data.tx.method}`),
    createMetric(isSell ? "原卖家" : "原买家", data.tx.from),
    createMetric("路由 To", data.tx.to),
    createMetric("原 Value", `${data.tx.valueEth} ETH`),
    createMetric("滑点设置", data.slippage?.forceMinOutZero ? "强制成交 / minOut=0" : data.slippage?.percent || ""),
    createMetric("状态", status.textContent)
  );
  if (isSell) {
    summary.append(
      createMetric(
        "授权",
        data.generated?.approve
          ? `${data.generated.approve.amount} ${data.generated.approve.symbol} -> ${shortAddress(data.generated.approve.spender)}`
          : "未生成"
      )
    );
  }
  resultEl.append(createSection("识别结果", summary));
  resultEl.append(
    createSection(
      isSell ? "卖出的代币" : "买到的代币",
      renderTokens(
        isSell ? data.sentTokens || [] : data.receivedTokens || [],
        isSell ? "没有识别到原卖家转出的 ERC20。" : "没有识别到直接转入原买家钱包的 ERC20。"
      )
    )
  );

  if (data.generated) {
    const generatedWrap = document.createElement("div");
    generatedWrap.className = "result";

    const confidence = document.createElement("span");
    confidence.className = `confidence ${data.generated.confidence}`.trim();
    confidence.textContent = `confidence: ${data.generated.confidence}`;
    generatedWrap.append(confidence);

    generatedWrap.append(
      createFillActions(
        data.generated.approve
          ? [
              { label: "填入授权", senderLabel: "1. 授权 approve", tx: data.generated.approve },
              { label: "填入卖出", senderLabel: "2. 卖出 swap", tx: data.generated }
            ]
          : [
              {
                label: isSell ? "填入卖出" : "填入买入",
                senderLabel: isSell ? "卖出 swap" : "买入 swap",
                tx: data.generated
              }
            ]
      )
    );

    if (data.generated.approve) {
      generatedWrap.append(
        createCopyGroup("1. 授权 approve", [
          { label: "To", value: data.generated.approve.to },
          { label: "ETH 金额参考", value: data.generated.approve.valueEth },
          { label: "Value Wei", value: data.generated.approve.valueWei },
          { label: "Data", value: data.generated.approve.data, tall: true }
        ], data.generated.approve)
      );
    }

    generatedWrap.append(
      createCopyGroup(data.generated.approve ? "2. 卖出 swap" : isSell ? "卖出 swap" : "买入 swap", [
        { label: "To", value: data.generated.to },
        { label: isSell ? "ETH 金额参考" : "购买ETH金额参考", value: data.generated.valueEth },
        { label: "Value Wei", value: data.generated.valueWei },
        { label: "Data", value: data.generated.data, tall: true }
      ], data.generated)
    );
    resultEl.append(createSection("生成交易", generatedWrap));

    const senderQueue = [];
    if (data.generated.approve) senderQueue.push({ label: "授权 approve", tx: data.generated.approve, kind: "approve" });
    senderQueue.push({ label: data.generated.approve ? "卖出 swap" : isSell ? "卖出 swap" : "买入 swap", tx: data.generated, kind: "swap" });
    setSenderQueue(senderQueue);

    if (data.generated.changes?.length) {
      resultEl.append(createSection("已修改", createList(data.generated.changes, "change-list")));
    }
    if (data.generated.warnings?.length) {
      resultEl.append(createSection("风险提示", createList(data.generated.warnings, "warning-list")));
    }
  } else {
    clearSenderQueue();
    const warning = createList(["填入你的钱包地址后，会生成可复制的 To / Value / Data。"], "warning-list");
    resultEl.append(createSection("生成交易", warning));
  }

  if (data.notes?.length) {
    resultEl.append(createSection("备注", createList(data.notes, "warning-list")));
  }

  loadingState.hidden = true;
  submitButton.disabled = false;
  submitButton.textContent = "解析并生成";
  setView("result");
}

function renderProbeResult(data) {
  resultEl.innerHTML = "";
  const riskText = data.risk === "high" ? "高风险" : data.risk === "medium" ? "需人工复核" : "低风险";
  setProbeStatus(`检测完成：${riskText}`, data.risk === "high" ? "error" : "ok");

  const summary = document.createElement("div");
  summary.className = "summary-grid";
  summary.append(
    createMetric("风险结论", riskText),
    createMetric("原交易", data.tx.hash),
    createMetric("原交易 To", data.tx.to || "无"),
    createMetric("方法", data.tx.selector),
    createMetric("原 Value", `${data.tx.valueEth} ETH`),
    createMetric("区块", data.tx.blockNumber ? String(data.tx.blockNumber) : "未知")
  );
  resultEl.append(createSection("检测结论", summary));

  const tokenSummary = document.createElement("div");
  tokenSummary.className = "summary-grid";
  tokenSummary.append(
    createMetric("识别代币", data.primaryToken ? `${data.primaryToken.symbol} / ${data.primaryToken.token}` : "未识别"),
    createMetric("识别来源", data.primaryToken?.source || "无"),
    createMetric("持币地址", data.holder || "未找到"),
    createMetric("当前余额", data.primaryToken ? `${data.holderBalance} ${data.primaryToken.symbol}` : "0"),
    createMetric("测试数量", data.primaryToken ? `${data.probeAmount} ${data.primaryToken.symbol}` : "0"),
    createMetric("协议", data.pool.protocol)
  );
  resultEl.append(createSection("代币 / 持币", tokenSummary));

  const taxSummary = document.createElement("div");
  taxSummary.className = "summary-grid";
  taxSummary.append(
    createMetric("买税估算", data.taxEstimates?.buyTax || "无法估算"),
    createMetric("卖税估算", data.taxEstimates?.sellTax || "无法估算")
  );
  resultEl.append(createSection("买卖税", taxSummary));
  if (data.taxEstimates?.notes?.length) {
    resultEl.append(createSection("税率说明", createList(data.taxEstimates.notes, "warning-list")));
  }

  const poolSummary = document.createElement("div");
  poolSummary.className = "summary-grid";
  poolSummary.append(
    createMetric("PoolManager", data.pool.poolManager || "未命中官方 v4 PoolManager"),
    createMetric("LP / 池子目标", data.pool.poolTarget || "未识别"),
    createMetric("Router", data.pool.router || "未识别"),
    createMetric("PoolId 候选", data.pool.poolIdCandidates[0] || "无"),
    createMetric("疑似 Hook", data.pool.hookCandidates[0] || "无"),
    createMetric("日志池子候选", data.pool.logAddressCandidates[0] || "无")
  );
  resultEl.append(createSection("池子 / Hook", poolSummary));

  if (data.simulations.length) {
    resultEl.append(createSection("模拟结果", createList(data.simulations.map((item) => item.text), "token-list")));
  }
  if (data.pool.poolIdCandidates.length > 1) {
    resultEl.append(createSection("PoolId 候选", createList(data.pool.poolIdCandidates, "token-list")));
  }
  if (data.pool.hookCandidates.length > 1) {
    resultEl.append(createSection("疑似 Hook / 路由地址", createList(data.pool.hookCandidates, "token-list")));
  }
  if (data.pool.endpointCandidates.length) {
    resultEl.append(createSection("资金交互地址", createList(data.pool.endpointCandidates.map((item) => item.text), "token-list")));
  }
  if (data.positives.length) {
    resultEl.append(createSection("正向信号", createList(data.positives, "change-list")));
  }
  if (data.warnings.length) {
    resultEl.append(createSection("风险提示", createList(data.warnings, "warning-list")));
  }
  if (data.transfers.length) {
    resultEl.append(
      createSection(
        "转账样本",
        createList(
          data.transfers.map((transfer) => `${transfer.amount} ${transfer.symbol}: ${shortAddress(transfer.from)} -> ${shortAddress(transfer.to)} (${shortAddress(transfer.token)})`),
          "token-list"
        )
      )
    );
  }

  probeSubmitButton.disabled = false;
  probeSubmitButton.textContent = "解析池子并预检";
  setView("result");
}

function renderError(error, details) {
  resultEl.innerHTML = "";
  setFormStatus(error || "解析失败", "error");
  const box = document.createElement("div");
  box.className = "error-box";
  box.textContent = details ? `${error}: ${details}` : error;
  resultEl.append(box);
  submitButton.disabled = false;
  submitButton.textContent = "解析并生成";
  setView("result");
}

function renderProbeError(error, details) {
  resultEl.innerHTML = "";
  setProbeStatus(error || "检测失败", "error");
  const box = document.createElement("div");
  box.className = "error-box";
  box.textContent = details ? `${error}: ${details}` : error;
  resultEl.append(box);
  probeSubmitButton.disabled = false;
  probeSubmitButton.textContent = "解析池子并预检";
  setView("result");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const tradeType = getTradeType();
  const txHash = extractTxHash(formData.get("txHash"));
  const walletAddress = extractAddress(formData.get("buyerAddress"));
  const rawTx = String(formData.get("txHash") || "").trim();
  const rawAddress = String(formData.get("buyerAddress") || "").trim();

  if (!txHash) {
    renderError("交易哈希不完整", "请粘贴完整 tx，格式是 0x + 64 位十六进制；也可以直接粘 Etherscan 交易链接。");
    return;
  }

  if (rawAddress && !walletAddress) {
    renderError("钱包地址不完整", "钱包地址格式应该是 0x + 40 位十六进制。");
    return;
  }

  const payload = {
    tradeType,
    txHash,
    walletAddress,
    tradeAmount: String(formData.get("tradeAmount") || "").trim(),
    slippagePercent: String(formData.get("slippagePercent") || "").trim(),
    forceMinOutZero: formData.get("forceMinOutZero") === "on"
  };

  showLoading(true);

  try {
    const data = await analyzeTransaction(payload);
    renderResult(data);
  } catch (err) {
    if (err && err.name === "AbortError") {
      renderError("请求超时", "这次 RPC 没回，重新点一次。");
      return;
    }
    renderError("请求失败", err instanceof Error ? err.message : String(err));
  }
});

probeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(probeForm);
  const subject = String(formData.get("probeSubject") || "").trim();
  const txHash = extractTxHash(subject);
  const tokenAddress = txHash ? "" : extractAddress(subject);
  const holderAddress = extractAddress(formData.get("probeHolderAddress"));
  const rawHolder = String(formData.get("probeHolderAddress") || "").trim();

  if (!txHash && !tokenAddress) {
    renderProbeError("输入不完整", "请粘贴完整 buy/mint tx、Etherscan 交易链接，或代币合约地址。");
    return;
  }
  if (rawHolder && !holderAddress) {
    renderProbeError("持币地址不完整", "持币地址格式应该是 0x + 40 位十六进制。");
    return;
  }

  probeSubmitButton.disabled = true;
  probeSubmitButton.textContent = "检测中...";
  setProbeStatus(txHash ? "正在读取交易日志、识别池子，并用 eth_call 做预检。" : "正在读取代币合约信息。");
  setView("loading");

  try {
    const data = await analyzeProbe({ txHash, tokenAddress, holderAddress });
    renderProbeResult(data);
  } catch (err) {
    renderProbeError("检测失败", err instanceof Error ? err.message : String(err));
  }
});

connectWalletButton.addEventListener("click", () => {
  connectWallet();
});

for (const button of toolNavButtons) {
  button.addEventListener("click", () => {
    showToolPanel(button.dataset.toolTarget, { scroll: false });
  });
}

buildApprovalButton.addEventListener("click", buildManualApproval);

sendTransactionButton.addEventListener("click", async () => {
  const provider = getProvider();
  if (!provider) {
    setSenderStatus("没有检测到浏览器钱包，请安装或打开 OKX Wallet。", "error");
    return;
  }

  const account = connectedAccount || (await connectWallet());
  if (!account) return;

  try {
    const chainId = await switchToMainnet(provider);
    updateWalletState(account, chainId);

    const to = extractAddress(sendToInput.value);
    if (!to) throw new Error("To 地址不完整");
    const value = decimalEthToHex(sendValueInput.value);
    const data = normalizeTxData(sendDataInput.value);
    const ok = window.confirm(`确认发送交易？\n\nTo: ${to}\n购买ETH金额: ${sendValueInput.value || "0"} ETH`);
    if (!ok) return;

    sendTransactionButton.disabled = true;
    sendTransactionButton.textContent = "等待钱包";
    setSenderStatus("请在钱包里确认交易。");

    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: normalizeAddress(account),
          to,
          value,
          data
        }
      ]
    });

    if (activeSenderStepIndex >= 0 && senderSteps[activeSenderStepIndex]) {
      senderSteps[activeSenderStepIndex].sent = true;
      const sentLabel = formatSenderStepLabel(activeSenderStepIndex);
      const nextIndex = senderSteps.findIndex((step, index) => index > activeSenderStepIndex && !step.sent);
      renderSenderSteps();
      if (nextIndex >= 0) {
        setSenderStatus(`已发送 ${sentLabel}：${hash}。等授权上链后，点 ${formatSenderStepLabel(nextIndex)} 填入发送器。`, "ok");
      } else {
        setSenderStatus(`已发送 ${sentLabel}：${hash}`, "ok");
      }
    } else {
      setSenderStatus(`已发送：${hash}`, "ok");
    }
  } catch (err) {
    setSenderStatus(err instanceof Error ? err.message : String(err), "error");
  } finally {
    sendTransactionButton.disabled = false;
    sendTransactionButton.textContent = "发送交易";
  }
});

const startupProvider = getProvider();
if (startupProvider?.on) {
  startupProvider.on("accountsChanged", (accounts) => {
    updateWalletState(accounts?.[0] || "", "");
  });
  startupProvider.on("chainChanged", (chainId) => {
    updateWalletState(connectedAccount, chainId);
  });
}

for (const input of form.querySelectorAll("input[name='tradeType']")) {
  input.addEventListener("change", updateModeCopy);
}

updateModeCopy();
