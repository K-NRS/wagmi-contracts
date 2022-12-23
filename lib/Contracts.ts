import { Signer } from "ethers"
import {
  useContract as useWagmiContract,
  useContractEvent as useWagmiContractEvent,
  // useContractInfiniteReads as useWagmiContractInfiniteReads,
  useContractRead as useWagmiContractRead,
  useContractReads as useWagmiContractReads,
  useContractWrite as useWagmiContractWrite,
  usePrepareContractWrite,
  useToken as useWagmiToken,
} from "wagmi"

import { Provider } from "@wagmi/core"

interface IContract {
  abi: any
  address: string
  token?: boolean
}

interface ICreateContractHooks {
  contracts: {
    [network: string]: {
      [key: string]: IContract
    }
  }
  wagmiClient: any
}

export const createContractHooks = ({
  contracts,
  wagmiClient,
}: ICreateContractHooks): {
  useContract: any
  useContractEvent: any
  useContractRead: any
  useContractReads: any
  useContractWrite: any
  useToken: any
} => {
  let currentNetwork = wagmiClient.provider.network.name
  let networkContracts = contracts[currentNetwork]
  wagmiClient.provider.on("network", (newNetwork: any, oldNetwork: any) => {
    currentNetwork = newNetwork.name
    networkContracts = contracts[currentNetwork]
  })

  const hooks = {
    useContract: (
      contractName: string,
      signerOrProvider?: Signer | Provider
    ): ReturnType<typeof useWagmiContract> => {
      const contract = networkContracts[contractName]
      const args = {
        abi: contract.abi,
        address: contract.address,
      }

      return useWagmiContract(
        signerOrProvider ? Object.assign(args, { signerOrProvider }) : args
      )
    },
    useContractEvent: (
      contractName: string,
      eventName: string,
      listener: (...args: any[]) => void,
      optionalArgs?: Parameters<typeof useWagmiContractEvent>
    ): ReturnType<typeof useWagmiContractEvent> => {
      const contract = networkContracts[contractName]
      return useWagmiContractEvent({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        eventName,
        listener,
      })
    },
    useContractRead: (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiContractRead>>
    ) => {
      const contract = networkContracts[contractName]
      return useWagmiContractRead({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        functionName,
      })
    },
    useContractReads: (params: {
      [contractName: string]: {
        functionName: string
      } & Partial<Parameters<typeof useWagmiContractRead>>
    }) => {
      const converted = Object.entries(params).reduce(
        (acc, [contractName, { functionName, ...optionalArgs }]) => {
          const contract = networkContracts[contractName]
          acc.push({
            ...optionalArgs,
            abi: contract.abi,
            address: contract.address,
            functionName,
          })
          return acc
        },
        [] as any
      )

      return useWagmiContractReads(converted)
    },
    useContractWrite: (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiContractWrite>>
    ) => {
      const contract = networkContracts[contractName]
      const { config } = usePrepareContractWrite({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        functionName,
      })

      return useWagmiContractWrite(config)
    },
    useToken: (
      tokenName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiToken>>
    ): ReturnType<typeof useWagmiToken> => {
      const tokens = Object.keys(networkContracts).reduce(
        (acc, contractName) => {
          const contract = networkContracts[contractName]
          if (contract.token) {
            acc[contractName] = contract
          }
          return acc
        },
        {} as any
      )

      const token = tokens[tokenName]

      return useWagmiToken({
        address: token.address,
        ...optionalArgs,
      })
    },
  }

  return hooks
}
