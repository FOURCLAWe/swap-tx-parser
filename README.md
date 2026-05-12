# Swap Tx Parser

A static Ethereum transaction parser for cloning successful buy or sell swaps.

Open a successful transaction hash, enter your wallet and amount, then copy the
generated `To`, `Value`, and `Data` fields. Sell mode also generates an ERC20
`approve` transaction when the sold token can be identified from logs.

The app runs entirely in the browser against a public Ethereum RPC endpoint. It
does not send transactions or ask for private keys.

The page also includes a hex sender for browser wallets. It prefers OKX Wallet
when available, including `window.okxwallet`, EIP-6963 providers, and multi-wallet
`window.ethereum.providers`. Fill `To`, `Value ETH`, and `Data`, then confirm
the transaction in your wallet. In sell mode, generated approval and swap
transactions are shown as sender steps, and the approval is filled first.
There is also a manual approval builder for generating an ERC20 `approve`
transaction from a token address, spender/router address, amount, and decimals.
