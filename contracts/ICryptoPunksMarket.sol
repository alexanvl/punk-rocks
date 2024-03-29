// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface ICryptoPunksMarket {
  function punkIndexToAddress(uint index_) external returns (address);
}