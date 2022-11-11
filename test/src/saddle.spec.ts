import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, BigNumber, Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import { Impersonate } from "../utils/utilities";

const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const FRAX = "0x853d955aCEf822Db058eb8505911ED77F175b99e";

describe("Saddle ", function () {
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let swap: Contract;
  let weth: Contract;
  let usdc: Contract;
  let usdt: Contract;
  let frax: Contract;

  before(async () => {
    signer = await Impersonate("0x1157A2076b9bB22a85CC2C162f20fAB3898F4101");
    user = await Impersonate("0x7713974908Be4BEd47172370115e8b1219F4A5f0");

    swap = await ethers.getContractAt("ISwap", "0xa6018520EAACC06C30fF2e1B3ee2c7c22e64196a", signer);

    weth = await ethers.getContractAt("IERC20", WETH_TOKEN, signer);
    usdc = await ethers.getContractAt("IERC20", USDC_TOKEN, signer);
    usdt = await ethers.getContractAt("IERC20", USDT, signer);
    frax = await ethers.getContractAt("IERC20", FRAX, signer);
  });

  it("Should Revert: Not Approve", async () => {
    await expect(swap.connect(signer).addLiquidity([parseEther("2"), 0, 0], 0, 1670488819)).to.be.revertedWith("SafeERC20: low-level call failed");
  });

  it("Should Revert:Amounts must match pooled tokens", async () => {
    await weth.connect(signer).approve(swap.address, parseEther("2"));

    await expect(swap.connect(signer).addLiquidity([parseEther("2"), 0, 100000, 1000], 0, 1670488819)).to.be.revertedWith("Amounts must match pooled tokens");
  });

  it("Should Revert:Couldn't mint min requested", async () => {
    await expect(swap.connect(signer).addLiquidity([parseEther("2"), 0, 0], parseEther("10"), 1670488819)).to.be.revertedWith("Couldn't mint min requested");
  });

  it("Should Revert:Deadline not met", async () => {
    await expect(swap.connect(signer).addLiquidity([parseEther("2"), 0, 0], parseEther("10"), 0)).to.be.revertedWith("Deadline not met");
  });

  it("Should Revert:(Becasue Less Amount in Signer Account)", async () => {
    await expect(swap.connect(signer).addLiquidity([parseEther("102"), 0, 0], parseEther("10"), 1670488819)).to.be.revertedWith(
      "SafeERC20: low-level call failed"
    );
  });

  it("Success fully add Liquidity", async () => {
    await swap.connect(signer).addLiquidity([parseEther("2"), 0, 0], 0, 1670488819);
  });

  it("Should Revert: Not Approve", async () => {
    await expect(swap.connect(signer).removeLiquidity(parseEther("1"), [0, 0, 0], 1670488819)).to.be.revertedWith("ERC20: burn amount exceeds allowance");
  });

  it("Should Revert: minAmounts must match poolTokens", async () => {
    const swapStorage = await swap.swapStorage();

    const lpToken = await ethers.getContractAt("IERC20", swapStorage[6]);

    await lpToken.connect(signer).approve(swap.address, parseEther("1000"));

    console.log("LP Token", await lpToken.connect(signer).balanceOf(signer.address));

    await expect(swap.connect(signer).removeLiquidity(parseEther("1"), [0], 1670488819)).to.be.revertedWith("minAmounts must match poolTokens");
  });

  it("Should Revert:Deadline not met", async () => {
    await expect(swap.connect(signer).removeLiquidity(parseEther("1"), [0, 0, 0], 0)).to.be.revertedWith("Deadline not met");
  });

  it("Should Revert:>LP.balanceOf(Remove balance Greater than LP balance)", async () => {
    await expect(swap.connect(signer).removeLiquidity(parseEther("100"), [0, 0, 0], 1670488819)).to.be.revertedWith(">LP.balanceOf");
  });

  it("Success fully Remove Liquidity", async () => {
    await swap.connect(signer).removeLiquidity(parseEther("1"), [0, 0, 0], 1670488819);
  });

  it("Should Revert:Cannot swap more than you own", async () => {
    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(10e18));

    await expect(swap.connect(signer).swap(0, 2, String(10e18), calculatedSwapReturn, 1670488819, { value: parseEther("0") })).to.be.revertedWith(
      "Cannot swap more than you own"
    );
  });

  it("Should Revert:Deadline not met", async () => {
    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(10e18));

    await expect(swap.connect(signer).swap(0, 2, String(3e18), calculatedSwapReturn, 0, { value: parseEther("0") })).to.be.revertedWith("Deadline not met");
  });
  it("Should Revert: Not Approve", async () => {
    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(3e18));

    await expect(swap.connect(signer).swap(0, 2, String(3e18), calculatedSwapReturn, 1670488819, { value: parseEther("0") })).to.be.revertedWith(
      "SafeERC20: low-level call failed"
    );
  });

  it("Should Revert:Token index out of range", async () => {
    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(3e18));
    await weth.connect(signer).approve(swap.address, parseEther("3"));

    await expect(swap.connect(signer).swap(0, 9, String(3e18), calculatedSwapReturn, 1670488819, { value: parseEther("0") })).to.be.revertedWith(
      "Token index out of range"
    );
  });

  it("Swap", async () => {
    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(2e18));

    await swap.connect(signer).swap(0, 2, String(2e18), calculatedSwapReturn, 1670488819, { value: parseEther("0") });
  });

  it.skip("Function", async function () {
    console.log(swap.functions);
    console.log(await swap.getA());

    const swapStorage = await swap.swapStorage();

    console.log("Lp Token Address", swapStorage[6]);

    await weth.connect(signer).approve(swap.address, parseEther("1000"));

    const calculatedPoolTokenAmount = await swap.connect(signer).calculateTokenAmount([parseEther("2"), 0, 0], true);

    console.log("calculatedPoolTokenAmount", calculatedPoolTokenAmount);

    await swap.connect(signer).addLiquidity([parseEther("2"), 0, 0], 0, 1670488819);

    const lpToken = await ethers.getContractAt("IERC20", swapStorage[6]);

    console.log("LP Token", await lpToken.connect(signer).balanceOf(signer.address));

    await lpToken.connect(signer).approve(swap.address, parseEther("1000"));

    await swap.connect(signer).removeLiquidity(parseEther("1"), [0, 0, 0], 1670488819);

    console.log("LP Token", await lpToken.connect(signer).balanceOf(signer.address));

    const calculatedSwapReturn = await swap.calculateSwap(0, 2, String(3e18));

    console.log("Calculated Swap", calculatedSwapReturn);

    await swap.connect(signer).swap(0, 2, String(3e18), calculatedSwapReturn, 1670488819, { value: parseEther("0") });
  });
});
