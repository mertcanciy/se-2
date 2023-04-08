import { ChangeEvent, useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import type { NextPage } from "next";
import { KeyIcon, PlayIcon, PlusSmallIcon} from "@heroicons/react/24/outline";
import { SunIcon } from "@heroicons/react/24/solid";
import { useScaffoldContractWrite, useScaffoldEventSubscriber, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { BigNumber } from "ethers";
import { useContractRead, useAccount, useContractWrite, usePrepareContractWrite, useContractEvent, useContractReads, useBalance } from "wagmi";
import { ABI } from "./const/CONSTANTS";
import { Address, AddressInput } from "~~/components/scaffold-eth";


interface IProposalInfo {
  proposer: string;
  confirmations: number;
  executed: boolean;
  deadline: number;
  txAddress: string;
  value: number;
  txData: string;
}  

function Accordion({ index, title, children, _selectedWallet, _totalConfirms, _requiredConfs }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { config: ConfirmConfig } = usePrepareContractWrite({
    address: _selectedWallet,
    abi: ABI,
    functionName: 'confirmTx',
    args: [BigNumber.from(index)],
  });
  const { write:ConfirmWrite } = useContractWrite(ConfirmConfig);

  const { config: RejectConfig } = usePrepareContractWrite({
    address: _selectedWallet,
    abi: ABI,
    functionName: 'rejectTx',
    args: [BigNumber.from(index)],
  });
  const { write:RejectWrite } = useContractWrite(RejectConfig);

  const { config: ExecuteConfig } = usePrepareContractWrite({
    address: _selectedWallet,
    abi: ABI,
    functionName: 'executeTx',
    args: [BigNumber.from(index)],
  });
  const { data:ExecuteResult, write:ExecuteWrite } = useContractWrite(ExecuteConfig);

  return (
    <div className="shadow-xl m-2 rounded-2xl" key={index}>
      <button
        className="pl-12 pr-12 text-gray-900 bg-gradient-to-r from-lime-200 via-lime-400 to-lime-500 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-lime-300 dark:focus:ring-lime-800 shadow-lg shadow-lime-500/50 dark:shadow-lg dark:shadow-lime-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span>{isOpen ? '  -' : '  +'}</span>
      </button>
      {isOpen && (
        <div className="p-4 bg-base-100 rounded-2xl">
          {children}
          
          <div className="flex row justify-content-center pt-5">
              <button
              className="mr-12 ml-12 pl-8 pr-8 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
              onClick={() => ConfirmWrite?.()}>
                CONFIRM
              </button>

              <button
              className="ml-12 pl-10 pr-10 text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
              onClick={() => RejectWrite?.()}>
                REJECT
              </button>
          </div>
          <div className="justify-content-center items-center pt-5 text-center">
          {_totalConfirms === _requiredConfs ? (
            <button 
            className="pl-12 pr-12 text-gray-900 bg-gradient-to-r from-lime-200 via-lime-400 to-lime-500 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-lime-300 dark:focus:ring-lime-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
            onClick={() => ExecuteWrite?.()}
            >
              EXECUTE</button>
          ) : (
            <></>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeInterval(timeInterval: number) {
  const seconds = Math.floor((timeInterval / 1000) % 60);
  const minutes = Math.floor((timeInterval / (1000 * 60)) % 60);
  const hours = Math.floor((timeInterval / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeInterval / (1000 * 60 * 60 * 24));

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

const Home: NextPage = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [requiredConfirms, setRequiredConfirms] = useState("1");
  const [createdEvent, setCreatedEvent] = useState("");
  const {address} = useAccount();
  const [selectedWallet, setSelectedWallet] = useState("");
  const [proposalTO, setProposalTO] = useState("");
  const [selectedDeadline, setSelectedDeadline] = useState<number>();
  const [txData, setTxData] = useState("");  
  const [txValue, setTxValue] = useState("0");
  const [proposedEvent, setProposedEvent] = useState("");
  const [currentNonce, setCurrentNonce] = useState<number>(0);
  const [walletToggle, setWalletToggle] = useState(true);

  const [myArray, setMyArray] = useState<number[]>([]);

  const handleAddAddress = () => {
    const input = document.getElementById("address-input") as HTMLInputElement;
    const value = input.value.trim();

    if (value) {
      setAddresses([...addresses, value]);
      input.value = "";
    }
  };

  const handleRemoveAddress = (address: string) => {
    const newAddresses = addresses.filter((a) => a !== address);
    setAddresses(newAddresses);
  };

  const { writeAsync } = useScaffoldContractWrite({
    contractName: "MultiSigWalletFactory",
    functionName: "createMultiSigWallet",
    args: [addresses, BigNumber.from(requiredConfirms)]
  });

  const sendSignersandConfirms = async () => {
    await writeAsync();
  };

  const { data: msgSenderHaveWallet } = useScaffoldContractRead({
    contractName: "MultiSigWalletFactory",
    functionName: "hasMultiSigWallet",
    args: [useAccount().address]
  });

  const { data: _userWallets } = useScaffoldContractRead({
    contractName: "MultiSigWalletFactory",
    functionName: "returnWalletAddresses",
    args: [address]
  });

  useScaffoldEventSubscriber({
    contractName: "MultiSigWalletFactory",
    eventName: "NewMultiSigWallet",
    listener(wallet, signers, requiredConfirmations) {
        setWalletToggle(true);
    },
  })

  const handleDeadlineChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.target.value;
    const deadlineTimestamp = Math.floor(new Date(selectedDate).getTime() / 1000);
    setSelectedDeadline(Number(deadlineTimestamp));
  };
  

  const handleTxDataChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputData = event.target.value;
    setTxData(inputData);
  };

  // Default data hex value
  const defaultTxData = "0x";

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputData = event.target.value;
    const weiValue = parseFloat(inputData) * 10**18;
    const stringWei = weiValue.toString();
    setTxValue(stringWei);
    
  };

  const { config } = usePrepareContractWrite({
    address: selectedWallet,
    abi: ABI,
    functionName: 'proposeTx',
    args: [selectedDeadline, proposalTO, BigNumber.from(txValue), txData || defaultTxData],
  });
  const { data, write } = useContractWrite(config);

  useContractEvent({
    address: selectedWallet,
    abi: ABI,
    eventName: 'NewProposal',
    listener(proposer, nonce) {
      setProposedEvent("Proposer: " + proposer + " Nonce: " + nonce)
    },
  })

  const { data: nonceValue } = useContractRead({
    address: selectedWallet,
    abi: ABI,
    functionName: 'nonce',
  });

  useEffect(() => {
    if (nonceValue !== undefined) {
      setCurrentNonce(Number(nonceValue));
  
      const newArray = [];
      for (let i = 0; i < Number(nonceValue); i++) {
        newArray.push(i);
      }
      setMyArray(newArray);
    }
  }, [nonceValue]);
  

  const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    setSelectedWallet(selectedValue);

  };

  const MultiContract = {
    address: selectedWallet,
    abi: ABI,
  };

  const streamInfoReads = myArray.map(_myArray => ({
    ...MultiContract,
    functionName: "nonceToTx",
    args: [BigNumber.from(_myArray)],
  }));

  const { data: _transactions }: {data: IProposalInfo[] | undefined} = useContractReads({
    contracts: streamInfoReads,
    watch: true,
  });

  const { data: _reqConfirms } = useContractRead({
    address: selectedWallet,
    abi: ABI,
    functionName: 'requiredConfirmations',
  });

  const { data: selectedWalletBalance, isError, isLoading } = useBalance({
    address: selectedWallet,
  })
 
  if (isLoading) return <div>Fetching balance…</div>
  if (isError) return <div>Error fetching balance</div>

  return (
    <>
      <Head>
        <title>Multi-Sig Factory</title>
        <meta name="description" content="Created with 🏗 scaffold-eth" />
      </Head>

      <div className="flex items-center flex-col flex-grow pt-10 mb-6">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">Welcome</span>
            <span className="text-2xl"> {address}</span>
            <span className="block text-4xl font-bold">MULTI SIG FACTORY!</span>
            
          </h1>
          

        </div>
        {msgSenderHaveWallet && walletToggle ? (       
          <div>
            <p className="text-center text-lg">
            HERE, YOU CAN CREATE AND VOTE THE PROPOSALS!
          </p>
          <p className="text-center text-lg">
           First, choose one of your wallets please.
          </p>
            
            <div className="flex bg-base-100 justify-center  items-center mt-8 p-5 rounded-3xl">

            <select id="addressDropdown" className="block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer " onChange={handleDropdownChange}>
              <option value="" disabled selected>CHOOSE A WALLET</option>
              {_userWallets?.map((wallet, index) => (
                <option value={wallet} key={index}>
                  {wallet}
                </option>
              ))}
            </select>              
            </div>
            
            <div className="flex flex-col bg-base-100 items-center rounded-3xl">
            <p className="font-bold">SELECTED WALLET: <Address address={selectedWallet}/></p>
            <p className="font-bold">WALLET BALANCE: </p>
            <h1>{selectedWalletBalance?.formatted} {selectedWalletBalance?.symbol}</h1>
            </div>

            <div className="flex bg-base-100 justify-center items-center mt-6 rounded-3xl">
            <PlayIcon className="h-8 w-8 fill-secondary" />
                    <p className="font-bold">PROPOSALS</p>
            </div>

            <div className="flex bg-base-300 justify-center items-center mt-6 p-10 rounded-3xl">
                    {/* {proposedEvent} */}
                
                    <div className="flex flex-col items-center">
                      {myArray?.map((_props, index) => {
                        const now = new Date().getTime();
                        const deadline = Number(_transactions?.[index].deadline) * 1000;
                        const remainingTime = deadline - now;
                        const remainingTimeString = formatTimeInterval(remainingTime);

                        return (
                          <Accordion key={index} index={index} title={`Proposal: ${index}`} _selectedWallet={selectedWallet} _totalConfirms={Number(_transactions?.[index].confirmations)} _requiredConfs={Number(_reqConfirms)}>
                            <div className="flex row justify-content-center p-3">
                              <div className="col-md-6 mr-12 pl-9">
                                <p>EXECUTED: {_transactions?.[index].executed ? "YES": "NO"}</p>
                              </div>
                              <div className="col-md-6 ml-12">
                              <p className="text-end">DEADLINE: {remainingTimeString}</p>
                              </div>
                              </div>
                                    
                              <div className="flex row justify-content-center p-3">
                                
                                <div className="col-md-3 mr-4">
                                  <h1 className="font-bold pl-6">PROPOSER: </h1>
                                  <h2 className="justify-content-center">
                                    <Address address={_transactions?.[index].proposer}></Address>
                                  </h2>
                                </div>
                                <div className="col-md-6 mr-6">
                                <h1 className="font-bold text-center">TO:</h1>
                                <h2 className="justify-content-center">
                                <Address address={_transactions?.[index].txAddress}></Address>
                                </h2>

                                </div>
                                <div className="col-md-3">
                                <h1 className="font-bold text-center">VALUE:</h1>
                                {Number(_transactions?.[index].value)/10**18} ETH
                                </div>
                              </div>
                              <h1 className="text-center mt-3 font-bold">CONFIRMATIONS: {Number(_transactions?.[index].confirmations)}/{Number(_reqConfirms)}</h1>
              
        {/* <p>DATA: {_transactions?.[index].txData}</p> */}
      </Accordion>
    );
  })}
</div>
 </div>

            <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12 rounded-3xl">
              
                <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
                    
                  <div className="flex flex-col bg-base-200 px-10 py-10 text-center items-center max-w-s rounded-3xl">
                    
                      <div className="flex flex-col items-center">
                      <label htmlFor="deadline">To:</label>
                        <AddressInput
                          value = {proposalTO}
                          onChange = {
                            v => {
                              setProposalTO(v);
                            }}
                          placeholder="ENTER AN ADDRESS"
                        />                     
                        
                        <label htmlFor="value" className="mt-5">Value:</label>
                        <input
                          id="address-input"
                          className="w-full border rounded-2xl py-2 px-3 mb-5"
                          placeholder="Enter the amount"
                          onChange={handleValueChange}
                        />
                        <label htmlFor="deadline" className="mt-5">Choose a deadline:</label>
                        <input type="datetime-local" id="deadline" onChange={handleDeadlineChange} name="deadline" className="mb-5 p-3 border rounded-2xl "/>
                          
                        <label htmlFor="txData" className="mt-5">TX Data:</label>
                        <input
                          id="txdata-input"
                          className="w-full border rounded-2xl py-2 px-3 mb-5"
                          placeholder="Default: Empty Data ('0x')"
                          value={txData}
                          onChange={handleTxDataChange}
                        />
                      </div>
                      <button
                          className="mt-3 text-gray-700 bg-gradient-to-r from-lime-200 via-lime-400 to-lime-500 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-lime-300 dark:focus:ring-lime-800 shadow-lg shadow-lime-500/50 dark:shadow-lg dark:shadow-lime-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                          onClick={() => write?.()}
                        >
                          <b>SUBMIT PROPOSAL</b>
                        </button>
                    
                  </div>                
              </div>          
              </div>  
              <div className="flex flex-col bg-base-100 justify-center  items-center p-3 mt-8">
                  <h1 className="mb-8 font-bold">You can create new wallets again, if you want!</h1>
              <button
                className="text-gray-900 bg-gradient-to-r from-lime-200 via-lime-400 to-lime-500 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-lime-300 dark:focus:ring-lime-800 shadow-lg shadow-lime-500/50 dark:shadow-lg dark:shadow-lime-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                onClick={() => {setWalletToggle(false)}}
              >
              CREATE NEW WALLET!
              </button>
            </div>
        </div>

        ) : (
          <div>
            <p className="text-center text-lg">
            You can create your own multi-sig wallet by defining signers
            and choose how many of them are enough to execute transactions!
            
          </p>
              <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12 shadow-xl rounded-3xl">
                <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
                  <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-s rounded-3xl shadow-xl">

                    <KeyIcon className="h-8 w-8 fill-secondary" />
                    <p className="font-bold">SIGNER ADDRESSES</p>
                    <div className="mt-4">
                      {addresses.map((address) => (
                        <div key={address} className="flex items-center mb-2">
                          <span className="border px-2 py-1 rounded-md mr-2">{address}</span>
                          <button onClick={() => handleRemoveAddress(address)}>x</button>
                        </div>
                      ))}
                      <div className="flex items-center">
                        <input
                          id="address-input"
                          className="w-full border rounded-2xl py-2 px-3"
                          placeholder="Enter an address"
                        />
                      
                        <button
                          className=" bg-orange-100 hover:bg-orange-200 text-white px-5 py-3 rounded-2xl m-4"
                          onClick={handleAddAddress}
                        >
                     
                          <b className="font-bold text-l">+</b>
                        </button>
                      </div>
                    </div>

                  </div>

              <div className="flex flex-col bg-base-100 px-10 py-12 text-center items-center max-w-s rounded-3xl shadow-xl">
                  <SunIcon className="h-8 w-8 fill-secondary" />
                  <p className="font-bold">
                    REQUIRED CONFIRMATIONS
                  </p>
                  
                  <input
                        id="requirement-input"
                        className="w-full border rounded-2xl py-2 px-3"
                        placeholder="Enter the number"
                        onChange={e => setRequiredConfirms(e.target.value)}
                  />         
              </div>

                <button
                  className="bg-white hover:bg-orange-200 text-black font-bold px-4 py-2 rounded-3xl mt-5"
                  onClick={sendSignersandConfirms}
                >
                CREATE THE WALLET!
                </button>
          </div>
            
              </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Home;