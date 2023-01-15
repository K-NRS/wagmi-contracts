import { useEffect } from "react"
import { Contract, Signer } from "ethers"
import {
  useContract as useWagmiContract,
  useContractEvent as useWagmiContractEvent,
  useContractRead,
  useContractRead as useWagmiContractRead,
  useContractReads as useWagmiContractReads,
  useContractWrite as useWagmiContractWrite,
  usePrepareContractWrite,
  useProvider,
  useSigner,
  useToken as useWagmiToken,
} from "wagmi"

import {
  Provider,
  getContract as getContractWagmi,
  readContract as readContractWagmi,
  readContracts as readContractsWagmi,
  prepareWriteContract,
  writeContract as writeContractWagmi,
  watchReadContract as watchReadContractWagmi,
  watchReadContracts as watchReadContractsWagmi,
  fetchSigner,
  getProvider,
} from "@wagmi/core"
import objectHash from "object-hash"

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

const createContractHooks = ({
  contracts,
  wagmiClient,
}: ICreateContractHooks) => {
  const storage = typeof window !== "undefined" ? window.localStorage : null

  let currentNetwork = wagmiClient.provider.network.name
  let networkContracts = contracts[currentNetwork]
  wagmiClient.provider.on("network", (newNetwork: any, oldNetwork: any) => {
    if (oldNetwork) {
      console.log("Network changed from", oldNetwork, "to", newNetwork)
    } else {
      console.log("Network set to", newNetwork)
    }
    currentNetwork = newNetwork.name
    networkContracts = contracts[currentNetwork]
  })

  const fallbackContract = (contractName: string) => {
    let contract = networkContracts?.[contractName]

    if (!contract) {
      // find contractName in contracts any network
      const networkIndex = Object.values(contracts).findIndex(
        (networkContracts) => networkContracts[contractName]
      )

      const networkKey = Object.keys(contracts)[networkIndex]

      const foundContract = contracts[networkKey][contractName]

      if (!networkIndex || !foundContract) {
        console.warn(
          `Contract "${contractName}" not found in network "${currentNetwork}".`
        )
      }

      contract = foundContract
    }

    return contract
  }

  const functions = {
    getContract: async (
      contractName: string,
      signerOrProvider?: Signer | Provider
    ): Promise<ReturnType<typeof getContractWagmi>> => {
      const signer = await fetchSigner()
      const provider = getProvider()
      const contract = fallbackContract(contractName)
      const args = {
        abi: contract.abi,
        address: contract.address,
      }

      if (signer) {
        Object.assign(args, { signerOrProvider: signer })
      } else if (provider) {
        Object.assign(args, { signerOrProvider: provider })
      }

      return getContractWagmi(
        signerOrProvider ? Object.assign(args, { signerOrProvider }) : args
      )
    },
    readContract: (
      contractName: string,
      functionName: string,
      args?: any,
      ...optionalArgs: Partial<Parameters<typeof readContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]

      return readContractWagmi({
        abi: contract.abi,
        address: contract.address as `0x${typeof contract.address}`,
        args,
        functionName,
        ...optionalArgs,
      })
    },
    readContracts: (params: {
      [contractName: string]: {
        functionName: string
      } & Partial<Parameters<typeof readContractsWagmi>>
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

      return readContractsWagmi(converted)
    },
    writeContract: async (
      contractName: string,
      functionName: string,
      args?: any,
      ...optionalArgs: Partial<Parameters<typeof writeContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]
      const config = await prepareWriteContract({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address as `0x${typeof contract.address}`,
        args,
        functionName,
      })

      return writeContractWagmi(config)
    },
    watchReadContract: (
      contractName: string,
      functionName: string,
      listener: (...args: any[]) => void,
      args?: any,
      ...optionalArgs: Partial<Parameters<typeof watchReadContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]

      return watchReadContractWagmi(
        {
          ...optionalArgs,
          abi: contract.abi,
          address: contract.address as `0x${typeof contract.address}`,
          args,
          functionName,
        },
        listener
      )
    },
    watchReadContracts: (
      params: {
        [contractName: string]: {
          functionName: string
          args?: any
          chainId?: number
        } & Partial<Parameters<typeof watchReadContractsWagmi>>
      },
      listener: (...args: any[]) => void
    ) => {
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

      return watchReadContractsWagmi(
        {
          contracts: converted,
        },
        listener
      )
    },
  }

  const hooks = {
    useContract: (
      contractName: string,
      signerOrProvider?: Signer | Provider
    ): [ReturnType<typeof useWagmiContract>, any] => {
      const { data: signer } = useSigner()
      const provider = useProvider()

      let contract = fallbackContract(contractName)

      const args = {
        abi: contract?.abi,
        address: contract?.address,
        signerOrProvider: signer || provider,
      }

      return [
        useWagmiContract(
          signerOrProvider ? Object.assign(args, { signerOrProvider }) : args
        ),
        !!contract,
      ]
    },
    useCachedContract: (
      contractName: string,
      methodName: string,
      args: any = []
    ) => {
      const key = "cc::" + objectHash([contractName, methodName, args])
      const value = storage?.getItem(key)
      if (value) {
        if (Date.now() - JSON.parse(value).timestamp < 1000 * 60 * 60) {
          return JSON.parse(value).data
        }
      }

      const contract = fallbackContract(contractName)

      const config = {
        abi: contract?.abi,
        address: contract?.address as `0x${typeof contract.address}`,
        functionName: methodName,
        args,
      }

      const result = useContractRead(config)

      useEffect(() => {
        localStorage.setItem(
          key,
          JSON.stringify({
            data: result,
            timestamp: Date.now(),
          })
        )
      }, [result])

      return result
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
        address: contract.address as `0x${typeof contract.address}`,
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
        address: contract.address as `0x${typeof contract.address}`,
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
        address: contract.address as `0x${typeof contract.address}`,
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

  return { functions, hooks }
}

export { createContractHooks }
