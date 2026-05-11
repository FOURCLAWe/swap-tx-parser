# Swap Tx Parser

A static Ethereum transaction parser for cloning successful buy or sell swaps.

Open a successful transaction hash, enter your wallet and amount, then copy the
generated `To`, `Value`, and `Data` fields. Sell mode also generates an ERC20
`approve` transaction when the sold token can be identified from logs.

The app runs entirely in the browser against a public Ethereum RPC endpoint. It
does not send transactions or ask for private keys.

The page also includes a hex sender for browser wallets such as OKX Wallet or
MetaMask. Fill `To`, `Value ETH`, and `Data`, then confirm the transaction in
your wallet.
