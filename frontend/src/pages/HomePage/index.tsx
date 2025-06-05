import { FC, useEffect, useState } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import classes from './index.module.css'
import { RevealInput } from '../../components/Input/RevealInput'
import { StringUtils } from '../../utils/string.utils'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { WAGMI_CONTRACT_CONFIG, WagmiUseReadContractReturnType } from '../../constants/config'
import { useWeb3Auth } from '../../hooks/useWeb3Auth'

export const HomePage: FC = () => {
  const { address } = useAccount()
  const {
    state: { authInfo },
    fetchAuthInfo,
  } = useWeb3Auth()

  const { data: numbersListData, refetch: refetchNumbersList } = useReadContract({
    ...WAGMI_CONTRACT_CONFIG,
    functionName: 'getNumbersList',
    args: [authInfo],
    query: {
      enabled: !!authInfo,
    },
  }) satisfies WagmiUseReadContractReturnType<'getNumbersList', [string[], string[]], [string]>

  const {
    data: addToNumbersListTxHash,
    writeContract,
    isPending: isWriteContractPending,
    isError: isWriteContractError,
    error: writeContractError,
  } = useWriteContract()
  const {
    isPending: isTransactionReceiptPending,
    isSuccess: isTransactionReceiptSuccess,
    isError: isTransactionReceiptError,
    error: transactionReceiptError,
  } = useWaitForTransactionReceipt({
    hash: addToNumbersListTxHash,
  })

  const isInteractingWithChain = isWriteContractPending || (addToNumbersListTxHash && isTransactionReceiptPending)

  const [numbersList, setNumbersList] = useState<{ names: string[], numbers: string[] } | null>(null)
  const [nameValue, setNameValue] = useState<string>('')
  const [numberValue, setNumberValue] = useState<string>('')
  const [numbersListRevealLabel, setNumbersListRevealLabel] = useState<string>()
  const [numbersListError, setNumbersListError] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string>()
  const [hasBeenRevealedBefore, setHasBeenRevealedBefore] = useState(false)

  useEffect(() => {
    if (authInfo && numbersListData) {
      setNumbersList({
        names: numbersListData[0],
        numbers: numbersListData[1],
      })
    }
  }, [numbersListData])

  const fetchNumbersList = async () => {
    setNumbersListError(null)
    setNumbersListRevealLabel('Please sign message and wait...')

    try {
      await fetchAuthInfo()
      await refetchNumbersList()
      setNumbersListRevealLabel(undefined)
      setHasBeenRevealedBefore(true)

      return Promise.resolve()
    } catch (ex) {
      setNumbersListError((ex as Error).message)
      setNumbersListRevealLabel('Something went wrong! Please try again...')

      throw ex
    }
  }

  useEffect(() => {
    if (isTransactionReceiptSuccess) {
      setNameValue('')
      setNumberValue('')

      if (!hasBeenRevealedBefore) {
        setNumbersList(null)
        setNumbersListRevealLabel('Tap to reveal')
      } else {
        fetchNumbersList()
      }
    } else if (isTransactionReceiptError || isWriteContractError) {
      setEntryError(transactionReceiptError?.message ?? writeContractError?.message)
    }
  }, [isTransactionReceiptSuccess, isTransactionReceiptError, isWriteContractError])

  const handleRevealChanged = async (): Promise<void> => {
    if (!isInteractingWithChain) {
      return await fetchNumbersList()
    }

    return Promise.reject()
  }

  const handleAddToNumbersList = async () => {
    setEntryError(undefined)

    if (!nameValue) {
      setEntryError('Name is required!')
      return
    }

    if (!numberValue) {
      setEntryError('Number is required!')
      return
    }

    if (!authInfo) {
      setEntryError('Authentication required!')
      return
    }

    await writeContract({
      ...WAGMI_CONTRACT_CONFIG,
      functionName: 'addToNumbersList',
      args: [nameValue, numberValue, authInfo],
    })
  }

  return (
    <div className={classes.homePage}>
      <Card header={<h2>Numbers Reclaim</h2>}>
        {address && (
          <>
            <div className={classes.activeMessageText}>
              <h3>Your Numbers List</h3>
              <p>Your private numbers list stored on-chain.</p>
            </div>
            <RevealInput
              value={numbersList ? 
                numbersList.names.map((name, index) => `${name}: ${numbersList.numbers[index]}`).join('\n') : 
                ''
              }
              label={address}
              disabled
              reveal={!!numbersList}
              revealLabel={!!numbersList ? undefined : numbersListRevealLabel}
              onRevealChange={handleRevealChanged}
            />
            {numbersListError && <p className="error">{StringUtils.truncate(numbersListError)}</p>}
            <div className={classes.setMessageText}>
              <h3>Add Entry</h3>
              <p>Add a new name and number to your list.</p>
            </div>
            <Input
              value={nameValue}
              label="Name"
              onChange={setNameValue}
              error={entryError}
              disabled={isInteractingWithChain}
            />
            <Input
              value={numberValue}
              label="Number"
              onChange={setNumberValue}
              disabled={isInteractingWithChain}
            />
            <div className={classes.setMessageActions}>
              <Button disabled={isInteractingWithChain} onClick={handleAddToNumbersList}>
                {isInteractingWithChain ? 'Please wait...' : 'Add Entry'}
              </Button>
            </div>
          </>
        )}
        {!address && (
          <>
            <div className={classes.connectWalletText}>
              <p>Please connect your wallet to get started.</p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
