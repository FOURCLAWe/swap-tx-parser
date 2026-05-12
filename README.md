# Swap Tx Parser

A static Ethereum transaction parser for cloning successful buy or sell swaps.

Open a successful transaction hash, enter your wallet and amount, then copy the
generated `To`, `Value`, and `Data` fields. Sell mode also generates an ERC20
`approve` transaction when the sold token can be identified from logs.

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
The left rail is ordered as parser, approval builder, then sender.
Parsed results include fill buttons that write the generated transaction into
the hex sender fields.
The wallet connect button lives in the top-right header.

The risk monitor accepts an early buy/mint transaction or a token contract.
With a transaction it estimates visible buy/sell tax from transfer logs,
identifies v4 PoolManager/PoolId candidates and possible Hook/router addresses,
then uses `eth_call` to preflight current buy, approve, and token
transfer-to-pool behavior. Contract-only mode is a basic scan; exact taxes need
transaction logs or a forked simulation.

The tools are separated behind a top navigation bar so only one form is visible
at a time.
