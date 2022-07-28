import { Simulator } from '../src/simulator';
import { expect } from 'chai';
import { Wallet, utils, ContractFactory } from 'ethers';
import WETH from './contracts/WETH9.json'

const wallet = new Wallet('0xee79b5f6e221356af78cf4c36f4f7885a11b67dfcc81c34d80249947330c0f82');
const receiver = Wallet.createRandom();

describe('Simulator', () => {
  it('block number is 0 initially', () => {
    const simulator = new Simulator();
    expect(simulator.getBlockNumber()).to.eq('0');
  })

  it('getChainID', async () => {
    const simulator = new Simulator();
    expect(simulator.getChainID()).to.eq('1337');
  });

  it('getTransactionCount', async () => {
    const simulator = new Simulator();
    expect(simulator.getTransactionCount(wallet.address)).to.eq(0);

    const tx = await wallet.signTransaction({
      data: '0x',
      nonce: 0,
      gasPrice: 875000000,
      gasLimit: 1000000,
      value: 0,
    });
    simulator.sendTransaction(tx);

    expect(simulator.getTransactionCount(wallet.address)).to.eq(1);
  });

  it('getTransaction', async () => {
    const simulator = new Simulator();
    const tx = await wallet.signTransaction({
      data: '0x',
      nonce: 0,
      gasPrice: 875000000,
      gasLimit: 1000000,
      value: 0,
    });
    const receipt = simulator.sendTransaction(tx);
    const transaction = simulator.getTransaction(receipt.txHash);

    const txParsed = utils.parseTransaction(tx);
    expect(transaction.IsPending).to.eq(false);
    expect(transaction.Tx.hash).to.eq(txParsed.hash);
    expect(transaction.Tx.to).to.eq(txParsed.to)
    expect(transaction.Tx.nonce).to.eq('0x0')
    expect(transaction.Tx.value).to.eq('0x0')
  });

  it('block number is advanced by mined transactions', async () => {
    const simulator = new Simulator();
    const tx = await wallet.signTransaction({
      data: '0x',
      nonce: 0,
      gasPrice: 875000000,
      gasLimit: 1000000,
      value: 0,
    });
    simulator.sendTransaction(tx);
    expect(simulator.getBlockNumber()).to.eq('1');
  })

  it('sendTransaction returns a receipt', async () => {
    const simulator = new Simulator();
    const tx = await wallet.signTransaction({
      to: receiver.address,
      data: '0x',
      nonce: 0,
      gasPrice: 875000000,
      gasLimit: 1000000,
      value: 0,
    });
    const txParsed = utils.parseTransaction(tx);

    const receipt = simulator.sendTransaction(tx);
    expect(receipt.from).to.eq(wallet.address);
    expect(receipt.to).to.eq(receiver.address);
    expect(receipt.txHash).to.eq(txParsed.hash);
    expect(receipt.status).to.eq(1);
    expect(receipt.blockNumber).to.eq('1');
    expect(receipt.transactionIndex).to.eq(0);
  });

  it('can deploy WETH and wrap Ether', async () => {
    const simulator = new Simulator();

    const contractInterface = new utils.Interface(WETH.abi);
    const weth = new ContractFactory(contractInterface, WETH.bytecode, wallet);
    const deployTx = simulator.sendTransaction(await wallet.signTransaction({
      ...weth.getDeployTransaction(),
      gasPrice: 875000000,
      gasLimit: 1000000,
      nonce: 0,
    }))
    expect(deployTx.to).to.eq('');
    expect(deployTx.contractAddress).to.eq(utils.getContractAddress({from: wallet.address, nonce: 0}))

    const depositData = contractInterface.encodeFunctionData('deposit');
    const value = utils.parseEther('1');
    const receipt = simulator.sendTransaction(await wallet.signTransaction({
      data: depositData,
      to: deployTx.contractAddress,
      value,
      gasPrice: 875000000,
      gasLimit: 1000000,
      nonce: 1,
    }));
    expect(receipt.status).to.eq(1);
    const balance = simulator.getBalance(deployTx.contractAddress);
    expect(balance).to.eq(value);
  });

  it('can deploy WETH and call it', async () => {
    const simulator = new Simulator();

    const contractInterface = new utils.Interface(WETH.abi);
    const weth = new ContractFactory(contractInterface, WETH.bytecode, wallet);
    const deployTx = simulator.sendTransaction(await wallet.signTransaction({
      ...weth.getDeployTransaction(),
      gasPrice: 875000000,
      gasLimit: 1000000,
      nonce: 0,
    }))

    const res = simulator.call({
      to: deployTx.contractAddress,
      data: contractInterface.encodeFunctionData('name'),
    })
    const [name] = contractInterface.decodeFunctionResult('name', res)
    expect(name).to.equal('Wrapped Ether')
  });

  it('getBalance', () => {
    const simulator = new Simulator();
    const balance1 = simulator.getBalance('0x0000000000000000000000000000000000000000');
    expect(balance1).to.eq('0');

    const balance2 = simulator.getBalance(wallet.address);
    expect(balance2).to.eq('100000000000000000000');
  })

  it('getBlock', async () => {
    const simulator = new Simulator();

    const tx = await wallet.signTransaction({
      data: '0x',
      nonce: 0,
      gasPrice: 875000000,
      gasLimit: 1000000,
      value: 0,
    });
    simulator.sendTransaction(tx);
    expect(simulator.getBlockNumber()).to.eq('1');

    const block = simulator.getBlock('1');
    expect(block.timestamp).to.be.a('string')
    expect(block.difficulty).to.be.a('string')
    expect(block.gasLimit).to.be.a('string')
    expect(block.hash).to.be.a('string')
    expect(block.number).to.be.equal('0x1')
  })
})