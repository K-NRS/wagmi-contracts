# wagmi-contracts

![GitHub Repo stars](https://img.shields.io/github/stars/K-NRS/wagmi-contracts?label=Github&style=social)

The library abstracts wagmi's hooks to access contracts by their names easily. So, you won't have to call hooks with address and abi every time.

## Usage

shell/wagmi.ts

```ts
import { createClient } from "wagmi"
import { createContractHooks } from "wagmi-contracts"

export const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
})

export const {
  useContract,
  useContractEvent,
  useContractRead,
  useContractReads,
  useContractWrite,
  useToken,
} = createContractHooks({
  contracts: {
    "bsc-testnet": {
      myFavouriteERC20Token: {
        address: "0x0000000000000000000000000000000000000000",
        abi: ERC20ABI,
      },
    },
  },
  wagmiClient,
})
```

components/component.tsx

```tsx
import { useContract } from "../shell/wagmi"
export const Component = () => {
  const myLovedContract = useContract("myFavouriteERC20Token") // ethers.Contract instance

  return (
    <>
      <button onClick={myLovedContract.approve}>Approve</button>
    </>
  )
}
```

## Todo

- [ ] Implementation of the `useContractInfiniteReads` hook
- [ ] Broader documentation
- [ ] Improvement for the type support
