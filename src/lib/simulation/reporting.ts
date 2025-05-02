import { prisma } from '../cache/dbCache';

export const simulationReport = {
  async generateReport(simulationId: string) {
    try {
      // Get simulation data
      const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId }
      });

      if (!simulation) {
        throw new Error(`Simulation with ID ${simulationId} not found`);
      }

      // Get agent stats
      const agentCount = await prisma.agent.count({
        where: { active: true }
      });

      // Get transaction stats
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: simulation.startedAt
          }
        }
      });

      const completedTransactions = transactions.filter(t => t.status === 'CONFIRMED');
      const failedTransactions = transactions.filter(t => t.status === 'FAILED');

      // Get message stats
      const messages = await prisma.message.findMany({
        where: {
          createdAt: {
            gte: simulation.startedAt
          }
        },
        include: {
          sender: {
            select: {
              personalityType: true
            }
          }
        }
      });

      // Prepare report data
      const reportData = {
        simulationId,
        startTime: simulation.startedAt,
        duration: simulation.endedAt 
          ? (simulation.endedAt.getTime() - simulation.startedAt.getTime()) / 1000 
          : (Date.now() - simulation.startedAt.getTime()) / 1000,
        activeAgents: agentCount,
        transactions: {
          total: transactions.length,
          completed: completedTransactions.length,
          failed: failedTransactions.length,
          successRate: transactions.length > 0 
            ? (completedTransactions.length / transactions.length) * 100
            : 0
        },
        messages: {
          total: messages.length,
          byPersonalityType: messages.reduce((acc, msg) => {
            const type = msg.sender?.personalityType || 'UNKNOWN';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        status: simulation.status
      };

      // Save report
      const report = await prisma.simulationReport.create({
        data: {
          details: reportData,
          isFinal: simulation.status === 'STOPPED'
        }
      });

      return report;
    } catch (error) {
      console.error('Error generating simulation report:', error);
      throw error;
    }
  },

  async generateInterimReport(simulationId: string) {
    try {
      return await this.generateReport(simulationId);
    } catch (error) {
      console.error('Error generating interim report:', error);
      return null;
    }
  }
};