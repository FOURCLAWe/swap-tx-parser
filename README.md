# Swap Tx Parser

A static Ethereum transaction parser for cloning successful buy or sell swaps.

Open a successful transaction hash, enter your wallet and amount, then copy the
generated `To`, `Value`, and `Data` fields. Sell mode also generates an ERC20
`approve` transaction when the sold token can be identified from logs.
Buy mode also includes `解析并买入`, which parses the reference transaction,
uses the connected wallet as the recipient when the wallet field is blank, and
submits the generated buy transaction through the browser wallet after a
confirmation prompt.

The app runs entirely in the browser against a public Ethereum RPC endpoint. It
does not send transactions or ask for private keys.

The page also includes a hex sender for browser wallets. It prefers OKX Wallet
when available, including `window.okxwallet`, EIP-6963 providers, and multi-wallet
`window.ethereum.providers`. Fill `To`, `购买ETH金额`, and `Data`, then confirm
the transaction in your wallet. Result fill buttons only fill `To` and `Data`,
leaving the ETH amount for manual entry. In sell mode, generated approval and swap
transactions are shown as sender steps, and the approval is filled first.
There is also a manual approval builder for generating an ERC20 `approve`
transaction from a token address, spender/router address, amount, and decimals.
If the spender is hard to find, paste a prior standard approve transaction in
the approval tool to fill Token, Spender, decimals, and amount automatically.
The approval tool can also parse and submit that generated approve transaction
through the connected wallet after confirmation.
Parsed results include fill buttons that write the generated transaction into
the hex sender fields.
The wallet connect button lives in the top-right header.

The risk monitor only asks for a token contract. It queries GoPlus,
Honeypot.is, Honeypot pair-specific checks, holder analysis, DexScreener pairs,
v4 PoolManager initialization logs, and the Uniswap v4 Quoter with automatic
defaults. For v4 pools it quotes multiple small sell sizes and compares the
output with the current pool price to flag severe sell-side loss even when the
ERC20 itself is plain. If the v4 pool initialization transaction was sent by
the token creator, the result is marked high risk as a dev-created pool. Exact
taxes still need transaction logs or a forked simulation.

The tools are separated behind a top navigation bar so only one form is visible
at a time.
