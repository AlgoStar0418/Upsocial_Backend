#Buy and Sell USDT Restful APIs

## Available APIs details

### /v1/create-wallet
-[Methods]\
 POST\
-[args]\
 userid\
-[description]\
Create new USDT wallet

### /v1/get-balance/{wallet-address}
-[Methods]\
 GET\
-[args]\
 N/A\
-[description]\
USDT wallet balance

### /v1/buy
-[Methods]\
 POST\
-[args]\
walletAddr, amount, referenceId\
-[description]\
Buy USDT (Transfer USDT to wallet from Master Wallet)

### /v1/sell
-[Methods]\
POST\
-[args]\
walletAddr, amount, referenceId\
-[description]\
Sell USDT (Transfer USDT from wallet to Master Wallet)

### /v1/transfer
-[Methods]\
POST\
-[args]\
sourceWalletAddr, destinationWalletAddr, amount, referenceId\
-[description]\
Transfer USDT from source wallet to destination wallet

### /v1/get-transaction/{transaction-id}
-[Methods]\
GET\
-[args]\
 N/A\
-[description]\
Get transaction data