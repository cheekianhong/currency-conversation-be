// tests/unit/convert.controller.test.ts
import { Request, Response, NextFunction } from 'express';
import { convert, countries, rates } from '../../src/controllers/convert.controller';
import { ConvertService } from '../../src/services/convert.service';
import { HTTP_STATUS } from '../../src/utils/httpStatus';

describe('ConvertController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('convert', () => {
    it('should successfully convert currency and return response', async () => {
      mockRequest.query = {
        from: 'USD',
        to: 'EUR',
        amount: '100',
      };

      const mockData = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
        rate: 0.85,
        converted: 85,
        asOf: '2023-10-10T00:00:00.000Z',
      };

      const convertSpy = jest.spyOn(ConvertService.prototype, 'convert').mockResolvedValue(mockData);

      convert(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(convertSpy).toHaveBeenCalledWith('USD', 'EUR', '100');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should successfully convert currency without amount and return response', async () => {
      mockRequest.query = {
        from: 'USD',
        to: 'EUR',
      };

      const mockData = {
        from: 'USD',
        to: 'EUR',
        rate: 0.85,
        asOf: '2023-10-10T00:00:00.000Z',
      };

      const convertSpy = jest.spyOn(ConvertService.prototype, 'convert').mockResolvedValue(mockData);

      convert(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(convertSpy).toHaveBeenCalledWith('USD', 'EUR', undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockRequest.query = {
        from: 'USD',
        to: 'EUR',
      };

      const error = new Error('Test Error');
      jest.spyOn(ConvertService.prototype, 'convert').mockRejectedValue(error);

      convert(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('rates', () => {
    it('should successfully return rates and return response', async () => {
      const mockData = {
        USD: 1,
        EUR: 0.85,
        GBP: 0.75,
      };

      const getRatesSpy = jest.spyOn(ConvertService.prototype, 'getRates').mockResolvedValue(mockData);

      rates(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(getRatesSpy).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Test Error');
      jest.spyOn(ConvertService.prototype, 'getRates').mockRejectedValue(error);

      rates(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('countries', () => {
    it('should successfully list countries and return response', async () => {
      const mockData = {
        counties: ['EUR', 'GBP', 'USD'],
      };

      const listCountriesSpy = jest.spyOn(ConvertService.prototype, 'listCountries').mockResolvedValue(mockData);

      countries(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(listCountriesSpy).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Test Error');
      jest.spyOn(ConvertService.prototype, 'listCountries').mockRejectedValue(error);

      countries(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
